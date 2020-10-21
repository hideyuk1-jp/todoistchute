class TodoistApi {
  timePrefix = "//";
  token;
  tasksUrl = "https://api.todoist.com/rest/v1/tasks";
  labelsUrl = "https://api.todoist.com/rest/v1/labels";
  tasks = [];
  tasksByDue = {};
  labels = [];

  constructor(token) {
    this.token = token;
  }

  // APIからアクティブタスクとラベル一覧を取得
  async load() {
    const myHeaders = new Headers();
    myHeaders.append("Authorization", "Bearer " + this.token);
    const [taskResponse, labelResponse] = await Promise.all([
      fetch(this.tasksUrl, {
        method: "GET",
        headers: myHeaders,
      }),
      fetch(this.labelsUrl, {
        method: "GET",
        headers: myHeaders,
      }),
    ]);
    if (taskResponse.ok) {
      this.tasks = await taskResponse.json();
    } else {
      taskResponse.text().then((text) => {
        console.log(
          "[TodoistChute] Failed to connect todoist task api: " + text
        );
      });
    }
    if (labelResponse.ok) {
      this.labels = await labelResponse.json();
    } else {
      labelResponse.text().then((text) => {
        console.log(
          "[TodoistChute] Failed to connect todoist label api: " + text
        );
      });
    }
    return taskResponse.ok && labelResponse;
  }

  // 予定日ごとのタスクを構築
  build() {
    this.tasksByDue = {}; //初期化
    this.tasks.map((task) => {
      if (!("due" in task)) return;
      if (!(task.due.date in this.tasksByDue)) {
        this.tasksByDue[task.due.date] = {
          times: 0,
          ptimes: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
          },
          count: 0,
          pcount: {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
          },
          tasks: [],
          untimedCount: 0,
        };
      }
      const time = this.calcTime(task);
      const priority = 5 - task.priority;
      this.tasksByDue[task.due.date].times += (time ?? 0);
      this.tasksByDue[task.due.date].ptimes[priority] += (time ?? 0);
      this.tasksByDue[task.due.date].count++;
      this.tasksByDue[task.due.date].pcount[priority]++;
      this.tasksByDue[task.due.date].tasks.push(task);
      if (time == null)
        this.tasksByDue[task.due.date].untimedCount++;
    });
  }

  calcTime(task) {
    let t_label;
    let t_text;
    // ラベルから集計
    if ("label_ids" in task) t_label = this.calcTimeFromLabel(task.label_ids);
    // タスクテキストから集計
    t_text = this.calcTimeFromText(task.content);
    if (t_label == null && t_text == null) return null;
    if (t_label != null && t_text != null) return t_label + t_text;
    if (t_label !== null) return t_label;
    return t_text;
  }

  calcTimeFromLabel(ids) {
    return ids
      .map((id) => {
        const targetLabel = this.labels.find((label) => label.id === id);
        if (targetLabel == null) return null;
        return this.calcTimeFromText(targetLabel.name);
      })
      .reduce((acc, val) => {
        if (acc == null && val == null) {
          return null;
        }
        if (acc != null && val != null) {
          return acc + val;
        }
        if (acc != null) {
          return acc;
        }
        return val;
      }, null);
  }

  calcTimeFromText(content) {
    const regexp = new RegExp(
      this.timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&") + "(\\d+)",
      "g"
    );
    const nums = content.match(regexp);
    return nums == null
      ? null
      : nums.reduce(
          (acc, val) => acc + parseInt(val.replace(this.timePrefix, "")),
          0
        );
  }
}

$(function () {
  const defaultCalender = "false"; // 見積時間カレンダー使用の初期値
  const defaultCalenderAccent = "false"; // 背景色強調の初期値
  const defaultCalenderAccentMinTime = 10; // 背景色強調の下限時間の初期値
  const defaultTodoistApiToken = ""; // APIトークンの初期値
  const defaultCalenderPriorityTasks = "false"; // 優先度別タスクの初期値
  const defaultCalenderPriority = "true"; // 優先度別タスクの初期値
  const defaultCalenderUntimedTasks = "false"; // 時間未設定タスクの初期値

  const numberPerPageMax = 15;

  let numberPerPage;
  let tcCalenderPage = 0;

  const tcCalenderCheckIntervalTime = 1000;

  const debugMode = false; // ログ出力する場合はtrue

  let taskContent = "";
  let labelContent = "";

  // 設定をchrome.storageから読込
  chrome.storage.sync.get(
    {
      tc_calender: defaultCalender,
      tc_calender_accent: defaultCalenderAccent,
      tc_calender_accent_min_time: defaultCalenderAccentMinTime,
      tc_todoist_api_token: defaultTodoistApiToken,
      tc_calender_priority_tasks: defaultCalenderPriorityTasks,
      tc_calender_p1: defaultCalenderPriority,
      tc_calender_p2: defaultCalenderPriority,
      tc_calender_p3: defaultCalenderPriority,
      tc_calender_p4: defaultCalenderPriority,
      tc_calender_untimed_tasks: defaultCalenderUntimedTasks,
    },
    async function (options) {
      // 見積時間カレンダーを表示しない設定の場合は終了
      if (options.tc_calender == "false") return false;

      const todoistApi = new TodoistApi(options.tc_todoist_api_token);

      // 定時実行用
      const check = async function () {
        if (debugMode) console.log("[tc-calender]check start");
        // TC本体がない場合は終了
        if (!$("#tc-wrapper").length) {
          if ($("#tc-calender").length) $("#tc-calender").remove();
          return false;
        }

        // データの取得に失敗した場合は終了
        if (!(await todoistApi.load())) {
          if (debugMode) console.log("[tc-calender]check: load error");
          return false;
        }
        if (debugMode) {
          console.log("[tc-calender]check: load tasks:", todoistApi.tasks);
          console.log("[tc-calender]check: load labels:", todoistApi.labels);
        }

        // ロードしたデータが表示済みのものと同一ならば終了
        if (
          taskContent == JSON.stringify(todoistApi.tasks) &&
          labelContent == JSON.stringify(todoistApi.labels) &&
          $("#tc-calender").length
        ) {
          if (debugMode)
            console.log("[tc-calender]check end: data is updated.");
          return false;
        }
        // 予定日ごとのタスクデータを構築
        todoistApi.build();
        if (debugMode) console.log("[tc-calender]build: data:", todoistApi.tasksByDue);
        //　表示
        view();
        return true;
      };

      // 表示
      const view = function () {
        if (debugMode) console.log("[tc-calender]view start");

        // ウィンドウ幅に応じて1ページに表示する日数をセット
        numberPerPage = getNumberPerPage();
        if (debugMode)
          console.log("Page: ", tcCalenderPage, "Number: ", numberPerPage);

        let tc_calender_html = '<div id="content-col-wrapper">';
        let d = new Date();
        d.setDate(d.getDate() + 1 + tcCalenderPage * numberPerPage);
        let months = {};
        for (let i = 1; i <= numberPerPage; i++) {
          const fd =
            d.getFullYear() +
            "-" +
            ("00" + (d.getMonth() + 1)).slice(-2) +
            "-" +
            ("00" + d.getDate()).slice(-2);
          let times = 0;
          let count = 0;
          let ptimes = { 1: 0, 2: 0, 3: 0, 4: 0 };
          let pcount = { 1: 0, 2: 0, 3: 0, 4: 0 };
          let untimedCount = 0;
          if (fd in todoistApi.tasksByDue) {
            times = todoistApi.tasksByDue[fd].times;
            count = todoistApi.tasksByDue[fd].count;
            ptimes = todoistApi.tasksByDue[fd].ptimes;
            pcount = todoistApi.tasksByDue[fd].pcount;
            untimedCount = todoistApi.tasksByDue[fd].untimedCount;
          }
          if (d.getMonth() + 1 in months) {
            months[d.getMonth() + 1]++;
          } else {
            months[d.getMonth() + 1] = 1;
          }
          if (
            options.tc_calender_accent == "true" &&
            times >= options.tc_calender_accent_min_time * 60
          ) {
            tc_calender_html += '<div class="content-col accent">';
          } else {
            tc_calender_html += '<div class="content-col">';
          }
          tc_calender_html +=
            "<div>" +
            d.getDate() +
            " " +
            [
              chrome.i18n.getMessage("sundayShort"),
              chrome.i18n.getMessage("mondayShort"),
              chrome.i18n.getMessage("tuesdayShort"),
              chrome.i18n.getMessage("wednesdayShort"),
              chrome.i18n.getMessage("thursdayShort"),
              chrome.i18n.getMessage("fridayShort"),
              chrome.i18n.getMessage("saturdayShort")
            ][d.getDay()] +
            "</div><div>" +
            count +
            "</div><div>" +
            (times / 60).toFixed(1) +
            " h" +
            "</div>";
          // 優先度別タスク数と時間の表示
          if (options.tc_calender_priority_tasks == "true") {
            const p_flag = {
              1: options.tc_calender_p1,
              2: options.tc_calender_p2,
              3: options.tc_calender_p3,
              4: options.tc_calender_p4,
            };
            for (let j = 1; j <= 4; j++) {
              if (p_flag[j] != "true") continue;
              tc_calender_html +=
                '<div class="p' +
                j +
                '">' +
                pcount[j] +
                "/" +
                (ptimes[j] / 60).toFixed(1) +
                "</div>";
            }
          }
          // 時間未設定タスク数の表示
          if (options.tc_calender_untimed_tasks == "true" && untimedCount > 0) {
            tc_calender_html += '<div class="untimed-count"><span>' + untimedCount + '</span></div>';
          }
          tc_calender_html += "</div>";

          d.setDate(d.getDate() + 1);
        }

        month_html = '<div id="month-col-wrapper">';
        let cur = 1;
        for (let key in months) {
          const monthName = chrome.i18n.getMessage("month" + key);
          month_html +=
            '<div class="month-col" style="grid-column:' +
            cur +
            "/" +
            (cur + months[key]) +
            ';">' +
            monthName +
            "</div>";
          cur += months[key];
        }
        month_html += "</div>";
        tc_calender_ele = $(
          '<div id="tc-calender"><span id="tc-calender-next" class="tc-calender-arrow kunoji"></span><span id="tc-calender-prev" class="tc-calender-arrow kunoji"></span>' +
            month_html +
            tc_calender_html +
            "</div>"
        );

        // html挿入
        if ($("#tc-wrapper").length) {
          if ($("#tc-calender").length) $("#tc-calender").remove();
          $("#tc-wrapper").append(tc_calender_ele);
          taskContent = JSON.stringify(todoistApi.tasks);
          labelContent = JSON.stringify(todoistApi.labels);
        }
      };

      const getNumberPerPage = () => {
        const w = $(window).width();
        let offset = 0;
        if (w > 750 && !$("left_menu").length) offset = -305;
        const cw = w - 110 + offset;
        return Math.min(numberPerPageMax, Math.floor(cw / 50));
      };

      // １回目実行
      check();

      // 定期実行
      setInterval(function () {
        check();
      }, tcCalenderCheckIntervalTime);

      // 矢印がクリックされた時、ページを変更してビューを再構築
      $(document).on("click", "#tc-calender-next", function () {
        if (debugMode) console.log("[tc-calender]arrow-prev click!");
        tcCalenderPage++;
        view();
      });
      $(document).on("click", "#tc-calender-prev", function () {
        if (debugMode) console.log("[tc-calender]arrow-prev click!");
        tcCalenderPage--;
        view();
      });

      // ウィンドウ幅が変わった場合にビューを更新
      $(window).resize(() => {
        tcCalenderPage = 0;
        view();
      });
    }
  );
});
