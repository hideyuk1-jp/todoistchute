/**
 * @license TodoistChute
 * (c) 2018 hideyuk1 https://hideyuk1.dev
 * License: MIT
 */

debugMode = false; // ログ出力する場合はtrue

const strall = chrome.i18n.getMessage("allDate"); // 日付を選択しない場合に表示される文字
const strnone = chrome.i18n.getMessage("noDate"); // 日付を選択しない場合に表示される文字
const defaultBeginTime = "09:00"; // 開始時刻の初期値
const defaultBreakTime = "1"; // 休憩時間の初期値
const defaultLinkIcon = "false"; // リンクアイコン挿入の初期値
const defaultTaskBar = "true"; // タスクバー使用の初期値

let tchtml;
const tcParentId = "#content"; // tcの親要素のID
const taskListParentId = ".main-view-layout"; // タスクリストを内包する要素のID
const tcCheckIntervalTime = 300; // タスクリストの変更をチェックする間隔の時間（ミリ秒）

$(async function () {
  let tcCurrentDate = new Date();
  let tcStartDate;

  let taskContent = null;
  let tcWidth = null;

  let tc_taskbar;

  const getOptionsFromChromeStorage = async () => {
    return new Promise((resolve, reject) => {
      chrome.storage.sync.get(
        {
          tc_begintime: defaultBeginTime,
          tc_breaktime: defaultBreakTime,
          tc_linkicon: defaultLinkIcon,
          tc_taskbar: defaultTaskBar,
        },
        resolve
      );
    }).then((data) => data);
  };
  const options = await getOptionsFromChromeStorage();

  // 休憩時間がhh:mm形式の場合
  var brtime = options.tc_breaktime.match(
    /^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/
  );
  if (brtime)
    options.tc_breaktime =
      Math.round((parseFloat(brtime[1]) + parseFloat(brtime[2]) / 60) * 100) /
      100;

  // 挿入される要素
  tchtml =
    '<div id="tc-wrapper"><div id="tc-body"><div id="tc-tasknum" class="tc-item"><h2>' +
    chrome.i18n.getMessage("remainedTaskName") +
    '</h2><div><span id="tc-cnt">-</span></div></div><div id="tc-totaltime" class="tc-item"><h2>' +
    chrome.i18n.getMessage("totalTimeName") +
    '</h2><div><span id="tc-hour">-</span></div></div><div id="tc-finishtime" class="tc-item"><h2>' +
    chrome.i18n.getMessage("finishTimeName") +
    '</h2><div><span id="tc-endtime">-</span></div></div><div id="tc-settingitems" class="tc-item"> ' +
    chrome.i18n.getMessage("dateSelectName") +
    ': <select id="tc-date"><option value="ALL">' +
    strall +
    "</option></select>　" +
    chrome.i18n.getMessage("startTimeName") +
    ': <input type="checkbox" name="tc-cbbegintime" id="tc-cbbegintime" /><input type="time" name="tc-begintime" id="tc-begintime" value="' +
    options.tc_begintime +
    '" disabled />　' +
    chrome.i18n.getMessage("breakTimeName") +
    ': <input type="checkbox" name="tc-cbbreaktime" id="tc-cbbreaktime" /><input type="number" step="0.01" name="tc-breaktime" id="tc-breaktime" value="' +
    options.tc_breaktime +
    '" disabled /> h</div><div id="tc-taskbar" style="display:flex"></div></div></div>';

  // フラグがtrueであればリンクアイコンのcssを挿入
  if (options.tc_linkicon == "true")
    $("head").append(
      '<style type="text/css"><!-- .task_content a:after {content: "";display: inline-block;width: 14px;height: 14px;margin-left: 4px;background-image: url(\'data:image/svg+xml;utf-8,<svg version="1.1" fill="orange" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="14px" height="14px" viewBox="0 0 512 512" xml:space="preserve"><g><path class="st0" d="M509.445,113.129c-2.547-13.219-7.047-26.141-13.453-38.359c-6.391-12.203-14.75-23.641-24.938-33.828		c-13.563-13.578-29.406-23.875-46.265-30.719c-25.297-10.219-52.828-12.781-79.266-7.656c-13.219,2.563-26.156,7-38.359,13.422		c-12.172,6.422-23.641,14.75-33.828,24.953l-66.25,66.25c-13.375,13.344-13.375,35.047,0,48.391s35.031,13.344,48.391,0		l66.25-66.281c7.031-7,15.016-12.172,23.594-15.672c12.844-5.203,27.031-6.531,40.547-3.906c6.75,1.313,13.328,3.594,19.531,6.844		c6.188,3.25,12,7.469,17.281,12.734c7.031,7.078,12.187,15.047,15.687,23.609c5.203,12.844,6.531,27.047,3.906,40.547		c-1.313,6.766-3.594,13.344-6.828,19.516c-3.281,6.219-7.484,12.031-12.765,17.313l-66.25,66.234		c-13.359,13.359-13.359,35.047,0,48.391s35.016,13.344,48.375,0l66.25-66.265c13.594-13.563,23.875-29.406,30.703-46.266		C512.008,167.083,514.555,139.551,509.445,113.129z"></path>	<path class="st0" d="M256.54,356.426l-66.266,66.266c-7.047,7.016-15.031,12.188-23.594,15.672		c-12.844,5.219-27.047,6.547-40.547,3.938c-6.766-1.328-13.328-3.625-19.531-6.859c-6.188-3.266-12-7.5-17.281-12.75		c-7.031-7.063-12.203-15.031-15.688-23.609c-5.203-12.828-6.531-27.031-3.922-40.563c1.313-6.75,3.609-13.328,6.844-19.516		c3.281-6.188,7.484-12,12.766-17.297l66.266-66.25c13.344-13.344,13.344-35.016,0-48.359c-13.375-13.359-35.031-13.359-48.391,0		l-66.25,66.234c-13.594,13.594-23.875,29.406-30.719,46.297c-10.234,25.266-12.781,52.844-7.672,79.219		c2.547,13.219,7.031,26.156,13.453,38.359c6.406,12.203,14.75,23.672,24.938,33.844c13.594,13.578,29.406,23.891,46.266,30.688		c25.281,10.266,52.844,12.813,79.25,7.703c13.234-2.563,26.156-7.047,38.344-13.453c12.203-6.391,23.672-14.75,33.859-24.938		l66.25-66.266c13.344-13.344,13.344-35.016,0-48.359C291.54,343.066,269.883,343.066,256.54,356.426z"></path>	<path class="st0" d="M342.43,169.567c-13.344-13.344-35.016-13.344-48.375,0l-124.516,124.5c-13.344,13.359-13.344,35.016,0,48.359		c13.375,13.375,35.047,13.375,48.391,0l124.5-124.5C355.805,204.567,355.805,182.926,342.43,169.567z"></path></g></svg>\');background-size: contain;}--></style>'
    );

  tc_taskbar = options.tc_taskbar;

  // タスクや幅に変更があれば時間計算を実行
  var check = function () {
    curTaskContent = $(taskListParentId).html();
    // タスクアイテムが変わったら時間計測を実行
    if (taskContent != curTaskContent) {
      calcTime();
      taskContent = curTaskContent;
      tcWidth = $("#tc-wrapper").width();
      return true;
    }

    // widthが変わったら時間計測を実行
    if (tcWidth != $("#tc-wrapper").width()) {
      calcTime();
      taskContent = curTaskContent;
      tcWidth = $("#tc-wrapper").width();
      return true;
    }

    // 現在時刻が変わったら時間計測を実行
    var time1 =
      tcCurrentDate.getHours() +
      ":" +
      ("0" + tcCurrentDate.getMinutes()).slice(-2);
    var date2 = new Date();
    var time2 = date2.getHours() + ":" + ("0" + date2.getMinutes()).slice(-2);
    if (time1 != time2) {
      calcTime();
      return true;
    }
  };

  // 時間計算を定期実行
  setInterval(function () {
    check();
  }, tcCheckIntervalTime);

  // 日付が変更された時
  $(document).on("change", "#tc-date", function () {
    if (debugMode) console.log("date change!");
    calcTime();
  });

  // 開始時刻や休憩時間が変更された時
  $(document).on("change", "#tc-begintime", function () {
    if (debugMode) console.log("begintime change!");
    calcTime();
  });
  $(document).on("change", "#tc-breaktime", function () {
    if (debugMode) console.log("breaktime change!");
    calcTime();
  });

  // 開始時刻や休憩時間のチェックボックスがクリックされた時
  $(document).on("click", "#tc-cbbegintime", function () {
    if (debugMode) console.log("begintime checkbox click!");
    $("#tc-begintime").prop("disabled", !$("#tc-cbbegintime").prop("checked"));
    calcTime();
  });
  $(document).on("click", "#tc-cbbreaktime", function () {
    if (debugMode) console.log("breaktime checkbox click!");
    $("#tc-breaktime").prop("disabled", !$("#tc-cbbreaktime").prop("checked"));
    calcTime();
  });

  // タスクバーのタスクがクリックされた時
  $(document).on("click", "#tc-taskbar .task", function () {
    if (debugMode) console.log("taskbar task click!");
    $("html,body").scrollTop(
      $(`.task_list_item[data-item-id="${$(this).data("target")}"`).offset()
        .top - $("#top_bar").height()
    );
  });

  // 時間計測
  function calcTime() {
    if (debugMode) console.log("calc!");

    // 処理時間計測用
    var calcStartTime = new Date(),
      calcEndTime;

    // 印刷画面やアクティビティ画面、近日予定画面の時は初期化して終了
    if (
      location.search.match(/print_mode=1/) ||
      location.hash.match(/activity/) ||
      $(".upcoming_view").length > 0
    ) {
      $("#tc-wrapper").remove();
      calcEndTime = new Date();
      return false;
    }

    // #tc-wrapperがない場合は挿入
    if (!$("#tc-wrapper").length) tcInsert();

    // タスクリストの取得
    taskData = getTaskList();
    if (typeof taskData === "undefined") {
      $("#tc-wrapper").remove();
      calcEndTime = new Date();
      return false;
    }

    // 日付リスト作成
    showDateList(taskData);
    var tcDateVal = $("#tc-date").val();
    if (debugMode) console.log("tcDateVal: ", tcDateVal);

    if (tcDateVal != "ALL") taskData = taskData.dateTasks[tcDateVal];
    if (debugMode) console.log("taskData: ", taskData);

    tasks = taskData.tasks;

    // dateの準備
    var date = new Date();
    tcCurrentDate = new Date(date.getTime());
    // 開始時刻の入力があればdateを更新
    if (
      $("#tc-begintime").val() != "" &&
      $("#tc-cbbegintime").prop("checked")
    ) {
      date = new Date(date.toDateString() + " " + $("#tc-begintime").val());
    }
    tcStartDate = new Date(date.getTime());

    var taskbarhtml = "";
    $.each(taskData.tasks, (i, v) => {
      if (v.project.name == "") {
        taskbarhtml = "";
        return false;
      }
      tcStartDate.setMinutes(tcStartDate.getMinutes() + v.time);
      // 日をまたぐ数を計算
      var ndate = new Date();
      var ddiff = getDiff(ndate.toDateString(), tcStartDate.toDateString());
      var taskfintime =
        tcStartDate.getHours() +
        ddiff * 24 +
        ":" +
        ("0" + tcStartDate.getMinutes()).slice(-2);
      taskbarhtml += `<div class="task" style="flex:${v.time}" data-target="${v.id}"><div class="taskbar" style="background-color:${v.project.color}"></div><p class="taskpopup"><span class="taskbar-tasktext">${v.body}</span> <span class="taskbar-tasktime">${v.time}m</span> <span class="taskbar-taskfintime">${taskfintime}</span><br /><span class="taskbar-prjname">≪ ${v.project.name}</span></p></div>`;
    });

    taskTime = taskData.times;

    calcPreDisplayTime = new Date();

    // 表示更新
    // 残りタスクを更新
    $("#tc-cnt").text(tasks.length);
    // 見積時間を更新
    $("#tc-hour").text((taskTime / 60).toFixed(1) + " h");
    // 完了予定を更新
    // 休憩時間の入力があれば加算
    if (
      $("#tc-breaktime").val() != "" &&
      $("#tc-cbbreaktime").prop("checked")
    ) {
      var brtime = $("#tc-breaktime")
        .val()
        .match(/^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/);
      if (brtime) {
        var brhours = brtime[1];
        var brminutes = brtime[2];
        if ($.isNumeric(brhours)) taskTime += parseInt(brhours) * 60; // 時間を加算
        if ($.isNumeric(brminutes)) taskTime += parseInt(brminutes); // 分を加算
      } else if ($.isNumeric($("#tc-breaktime").val())) {
        taskTime += parseInt(parseFloat($("#tc-breaktime").val()) * 60);
      }
    }
    // 時間計算
    date.setMinutes(date.getMinutes() + taskTime);
    // 日をまたぐ数を計算
    var ndate = new Date();
    var ddiff = getDiff(ndate.toDateString(), date.toDateString());
    $("#tc-endtime").text(
      date.getHours() + ddiff * 24 + ":" + ("0" + date.getMinutes()).slice(-2)
    );

    calcPreTaskbarTime = new Date();

    // タスクバーを更新
    // 初期化
    $("#tc-taskbar").empty();
    if (tc_taskbar == "true" && taskbarhtml != "" && taskTime > 0) {
      // プロジェクトが存在する場合
      // タスクバー表示
      $("#tc-taskbar").css("display", "flex");
      $("#tc-tasknum").css({
        borderBottomLeftRadius: "0",
        mozBorderBottomLeftRadius: "0",
        webkitBorderBottomLeftRadius: "0",
        OBorderBottomLeftRadius: "0",
        msBorderBottomLeftRadius: "0",
      });
      $("#tc-finishtime").css({
        borderBottomRightRadius: "0",
        mozBorderBottomRightRadius: "0",
        webkitBorderBottomRightRadius: "0",
        OBorderBottomRightRadius: "0",
        msBorderBottomRightRadius: "0",
      });

      // 合計時間を置換して、タスクバー表示
      $("#tc-taskbar").append(taskbarhtml);
    } else {
      // プロジェクトが存在しない場合（プロジェクトのページなど）
      // タスクバー非表示
      $("#tc-taskbar").css("display", "none");
      $("#tc-tasknum").css({
        borderBottomLeftRadius: "4px",
        mozBorderBottomLeftRadius: "4px",
        webkitBorderBottomLeftRadius: "4px",
        OBorderBottomLeftRadius: "4px",
        msBorderBottomLeftRadius: "4px",
      });
      $("#tc-finishtime").css({
        borderBottomRightRadius: "4px",
        mozBorderBottomRightRadius: "4px",
        webkitBorderBottomRightRadius: "4px",
        OBorderBottomRightRadius: "4px",
        msBorderBottomRightRadius: "4px",
      });
    }

    calcEndTime = new Date();
    if (debugMode)
      console.log(
        "Total: " +
          (calcEndTime.getTime() - calcStartTime.getTime()) +
          "ms (Calc: " +
          (calcPreDisplayTime.getTime() - calcStartTime.getTime()) +
          "ms) (Display: " +
          (calcPreTaskbarTime.getTime() - calcPreDisplayTime.getTime()) +
          "ms) (Taskbar: " +
          (calcEndTime.getTime() - calcPreTaskbarTime.getTime()) +
          "ms)"
      );
  }

  // TodoistChute挿入
  function tcInsert() {
    // 初期化
    $("#tc-wrapper").remove();
    // html挿入
    $(tcParentId).prepend(tchtml);
  }

  // タスクリストの取得し、jsonを返す
  function getTaskList() {
    var dateTasks = {};
    var allTasks = [];
    var allTimes = 0;
    $(`${tcParentId} ul.items`).each((i, els) => {
      var sectionDate = els.dataset.dayListId;
      $(els)
        .find(
          "li.task_list_item:not(:hidden, .task_list_item--completed, .moreItemsHint)"
        )
        .each((i2, el) => {
          var time = taskTimeSum(el);
          if (typeof sectionDate === "undefined") {
            var date = $(el)
              .find(".date")
              .textNodeText()
              .replace(/\d\d:\d\d/g, "")
              .trim();
          } else {
            var date = sectionDate;
          }
          if (date === "") date = strnone;
          var task = {
            id: el.dataset.itemId,
            body: $(el).find(".task_content").text(),
            time,
            date,
            project: {
              name: $(el).find(".task_list_item__project").text(),
              color: $(el).find(".task_list_item__project svg").css("color"),
            },
          };

          allTasks.push(task);
          allTimes += time;

          if (Object.keys(dateTasks).indexOf(date) !== -1) {
            dateTasks[date].tasks.push(task);
            dateTasks[date].times += time;
          } else {
            dateTasks[date] = { tasks: [task], times: time };
          }
        });
    });

    var data = {
      tasks: allTasks,
      times: allTimes,
      dateTasks: dateTasks,
    };

    return data;
  }

  function taskTimeSum(el) {
    let taskTime = 0;

    // ラベルから集計
    $(el)
      .find(".task_list_item__info_tags__label")
      .each((_, label) => {
        const match = $(label)
          .text()
          .match(
            /^\/\/((?<hours>\d+(\.\d+)?)(:|h|時間))?((?<minutes>\d+)(m|分)?)?$/
          );
        if (!match) return;
        const { hours = 0, minutes = 0 } = match.groups;
        taskTime += +hours * 60 + +minutes;
      });

    // タスクテキストから集計
    const matches = $(el)
      .find(".task_content")
      .text()
      .matchAll(
        /\/\/((?<hours>\d+(\.\d+)?)(:|h|時間))?((?<minutes>\d+)(m|分)?)?/g
      );
    if (!matches) return taskTime;
    for (const match of matches) {
      const { hours = 0, minutes = 0 } = match.groups;
      taskTime += +hours * 60 + +minutes;
    }

    return taskTime;
  }

  // 日付リストの表示
  function showDateList(taskData) {
    // 現在選択中の日付を取得
    var tcDateVal = $("#tc-date").val();

    // 初期化
    $("#tc-date").empty();
    $("#tc-date").append($("<option></option>").val("ALL").text(strall));

    // 日付が1種類以下の場合は全てで事足りるため処理終了
    if (Object.keys(taskData.dateTasks).length <= 1) return false;

    // 日付リストからドロップダウンリストに挿入
    var dvalhtml = "";
    $.each(taskData.dateTasks, (i, v) => {
      dvalhtml += `<option value="${i}">${getStrFromDate(i)}</option>`;
    });
    $("#tc-date").append(dvalhtml);

    // 日付順にソート
    $("#tc-date").html(
      $("#tc-date option").sort(function (a, b) {
        return getDateFromStr($(a).text()).getTime() >
          getDateFromStr($(b).text()).getTime()
          ? 1
          : -1;
      })
    );

    // 選択を戻す
    $("#tc-date").val(tcDateVal);

    // 選択肢がなければALLにする
    if (!$("#tc-date").val()) {
      $("#tc-date").val("ALL");
    }
  }

  // 日付の差分日数を返す
  function getDiff(date1Str, date2Str) {
    var date1 = new Date(date1Str);
    var date2 = new Date(date2Str);

    // ２つの日付の差（ミリ秒）を求める
    var msDiff = date2.getTime() - date1.getTime();

    // 求めた差分（ミリ秒）を日数へ変換
    var daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    // 差分日数を返す
    return daysDiff;
  }

  // 今日や土曜日などの文字列をdateで変換して返す（変換失敗時は："Invalid Date"）
  function getDateFromStr(str) {
    var date = new Date();

    // 指定しない
    if (str === strall) return new Date("1900/1/1");
    // 日付なし
    if (str === strnone) return new Date("1900/1/2");

    // 今日、明日、昨日の場合はそのDateを返す
    if (str == "今日" || str == "Today") return date;
    if (str == "明日" || str == "Tomorrow") {
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (str == "昨日" || str == "Yesterday") {
      date.setDate(date.getDate() - 1);
      return date;
    }

    // 期限切れの場合は前日
    if (str == "期限切れ" || str == "Overdue" || str == "overdue") {
      date.setDate(date.getDate() - 1);
      return date;
    }

    // 曜日表記の場合、一週間以内の日付で曜日が一致する日付を返す
    if (str.match(/曜日/) || str.match(/day/)) {
      for (i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        var japaneseDay = [
          "日曜日",
          "月曜日",
          "火曜日",
          "水曜日",
          "木曜日",
          "金曜日",
          "土曜日",
        ];
        var englishDay = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        if (
          str == japaneseDay[date.getDay()] ||
          str == englishDay[date.getDay()]
        )
          return date;
      }
    }

    // 年月日表記の場合
    if (str.match(/(\d{4})年([1-9]|1[012])月([1-9]|[12][0-9]|3[01])日/)) {
      str = str.replace(/年/g, "/").replace(/月/g, "/").replace(/日/g, "");
      // Dateにして返す
      return new Date(str);
    }
    // 英語表記の年月日の場合
    if (str.match(/([1-9]|[12][0-9]|3[01]) (\D{3}) (\d{4})/))
      return new Date(str);

    // 月日の場合は今年として年を追加
    if (str.match(/([1-9]|1[012])月([1-9]|[12][0-9]|3[01])日/)) {
      str = date.getFullYear() + "/" + str;
      str = str.replace(/年/g, "/").replace(/月/g, "/").replace(/日/g, "");
      // Dateにして返す
      return new Date(str);
    }
    // 英語表記の月日の場合
    if (str.match(/([1-9]|[12][0-9]|3[01]) (\D{3})/))
      return new Date(str + " " + date.getFullYear());

    // Dateにして返す
    return new Date(str);
  }

  function getStrFromDate(str) {
    if (str == "overdue") return chrome.i18n.getMessage("Overdue");
    var today = new Date();
    var yesterday = today;
    yesterday = yesterday.setDate(yesterday.getDate() - 1);
    var tomorrow = today;
    tomorrow = tomorrow.setDate(tomorrow.getDate() + 1);
    if (str === formatDate(today, "yyyy-MM-dd"))
      return chrome.i18n.getMessage("today");
    if (str === formatDate(yesterday, "yyyy-MM-dd"))
      return chrome.i18n.getMessage("yesterday");
    if (str === formatDate(tomorrow, "yyyy-MM-dd"))
      return chrome.i18n.getMessage("tomorrow");
    return str;
  }

  function formatDate(date, format) {
    date = new Date(date);
    format = format.replace(/yyyy/g, date.getFullYear());
    format = format.replace(/MM/g, ("0" + (date.getMonth() + 1)).slice(-2));
    format = format.replace(/dd/g, ("0" + date.getDate()).slice(-2));
    format = format.replace(/HH/g, ("0" + date.getHours()).slice(-2));
    format = format.replace(/mm/g, ("0" + date.getMinutes()).slice(-2));
    format = format.replace(/ss/g, ("0" + date.getSeconds()).slice(-2));
    format = format.replace(/SSS/g, ("00" + date.getMilliseconds()).slice(-3));
    return format;
  }

  // 直下のテキストノードのみ取得
  $.fn.textNodeText = function () {
    var result = "";
    $(this)
      .contents()
      .each(function () {
        if (this.nodeType === 3 && this.data) {
          result += jQuery.trim($(this).text());
        }
      });
    return result;
  };
});
