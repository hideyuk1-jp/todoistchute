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
        };
      }
      const time = this.calcTime(task);
      this.tasksByDue[task.due.date].times += time;
      this.tasksByDue[task.due.date].ptimes[task.priority] += time;
      this.tasksByDue[task.due.date].count++;
      this.tasksByDue[task.due.date].pcount[task.priority]++;
      this.tasksByDue[task.due.date].tasks.push(task);
    });
  }

  calcTime(task) {
    let total = 0;
    // ラベルから集計
    if ("label_ids" in task) total += this.calcTimeFromLabel(task.label_ids);
    // タスクテキストから集計
    total += this.calcTimeFromText(task.content);
    return total;
  }

  calcTimeFromLabel(ids) {
    return ids
      .map((id) => {
        const targetLabel = this.labels.find((label) => label.id === id);
        return targetLabel !== null
          ? this.calcTimeFromText(targetLabel.name)
          : 0;
      })
      .reduce((acc, val) => acc + val, 0);
  }

  calcTimeFromText(content) {
    const regexp = new RegExp(
      this.timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&") + "(\\d+)",
      "g"
    );
    const nums = content.match(regexp);
    return nums == null
      ? 0
      : nums.reduce(
          (acc, val) => acc + parseInt(val.replace(this.timePrefix, "")),
          0
        );
  }
}

$(function () {
  const defaultCalender = "false"; // 見積時間カレンダー使用の初期値
  const defaultTodoistApiToken = ""; // APIトークンの初期値

  const numberDatesPerPageFull = 15;
  const tcCalenderCheckIntervalTime = 1000;

  const debugMode = false; // ログ出力する場合はtrue

  let taskContent = "";
  let labelContent = "";

  // 設定をchrome.storageから読込
  chrome.storage.sync.get(
    {
      tc_calender: defaultCalender,
      tc_todoist_api_token: defaultTodoistApiToken,
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
          if ($("#tc-calender-wrapper").length)
            $("#tc-calender-wrapper").remove();
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
          $("#tc-calender-wrapper").length
        ) {
          if (debugMode)
            console.log("[tc-calender]check end: data is updated.");
          return false;
        }
        // 予定日ごとのタスクデータを構築
        todoistApi.build();
        //　表示
        view();
        return true;
      };

      // 表示
      const view = function () {
        if (debugMode) console.log("[tc-calender]view start");

        let tc_calender_html = '<div id="content-col-wrapper">';
        let d = new Date();
        let months = {};
        for (let i = 1; i <= numberDatesPerPageFull; i++) {
          d.setDate(d.getDate() + 1);
          const fd =
            d.getFullYear() +
            "-" +
            ("00" + (d.getMonth() + 1)).slice(-2) +
            "-" +
            ("00" + d.getDate()).slice(-2);
          let times = 0;
          let count = 0;
          if (fd in todoistApi.tasksByDue) {
            times = todoistApi.tasksByDue[fd].times;
            count = todoistApi.tasksByDue[fd].count;
          }
          if (d.getMonth() + 1 in months) {
            months[d.getMonth() + 1]++;
          } else {
            months[d.getMonth() + 1] = 1;
          }
          tc_calender_html +=
            '<div class="content-col">' +
            d.getDate() +
            " " +
            ["日", "月", "火", "水", "木", "金", "土"][d.getDay()] +
            "<br />" +
            count +
            "<br />" +
            (times / 60).toFixed(1) +
            " h" +
            "</div>";
        }

        month_html = '<div id="month-col-wrapper">';
        let cur = 1;
        for (let key in months) {
          month_html +=
            '<div class="month-col" style="grid-column:' +
            cur +
            "/" +
            (cur + months[key]) +
            ';">' +
            key +
            "月" +
            "</div>";
          cur += months[key];
        }
        month_html += "</div>";
        tc_calender_ele = $(
          '<div id="tc-calender-wrapper"><div id="tc-calender">' +
            month_html +
            tc_calender_html +
            "</div></div>"
        );

        // html挿入
        if ($("#tc-wrapper").length) {
          if ($("#tc-calender-wrapper").length)
            $("#tc-calender-wrapper").remove();
          $("#tc-wrapper").append(tc_calender_ele);
          taskContent = JSON.stringify(todoistApi.tasks);
          labelContent = JSON.stringify(todoistApi.labels);
        }
      };

      // 定期実行
      setInterval(function () {
        check();
      }, tcCalenderCheckIntervalTime);
    }
  );
});
