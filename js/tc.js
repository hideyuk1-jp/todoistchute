/**
 * @license TodoistChute
 * (c) 2018 hideyuk1 https://hideyuk1.dev
 * License: MIT
 */
$(function () {
  debugMode = false; // ログ出力する場合はtrue

  var strall = chrome.i18n.getMessage("allDate"); // 日付を選択しない場合に表示される文字
  var strnone = chrome.i18n.getMessage("noDate"); // 日付を選択しない場合に表示される文字
  var timePrefix = "//"; // 見積時間の接頭辞
  var defaultBeginTime = "09:00"; // 開始時刻の初期値
  var defaultBreakTime = "1"; // 休憩時間の初期値
  var defaultLinkIcon = "false"; // リンクアイコン挿入の初期値
  var defaultTaskBar = "true"; // タスクバー使用の初期値

  var tchtml;
  var tcParentId = "#content"; // tcの親要素のID
  var taskListParentId = "#editor"; // タスクリストを内包する要素のID
  var tcCheckIntervalTime = 300; // タスクリストの変更をチェックする間隔の時間（ミリ秒）

  var tcCurrentDate = new Date();
  var tcStartDate;

  var taskContent = null;
  var tcWidth = null;

  var tc_taskbar;

  // fontawesome挿入
  $("head").append(
    '<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">'
  );

  // 設定をchrome.storageから読込
  chrome.storage.sync.get(
    {
      tc_begintime: defaultBeginTime,
      tc_breaktime: defaultBreakTime,
      tc_linkicon: defaultLinkIcon,
      tc_taskbar: defaultTaskBar,
    },
    function (options) {
      // 休憩時間がhh:mm形式の場合
      var brtime = options.tc_breaktime.match(
        /^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/
      );
      if (brtime)
        options.tc_breaktime =
          Math.round(
            (parseFloat(brtime[1]) + parseFloat(brtime[2]) / 60) * 100
          ) / 100;

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
          '<style type="text/css"><!-- .task_content a:after {margin: 0 3px;font-family: FontAwesome;content: "\\f08e";font-size: 100%;} --></style>'
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
        var time2 =
          date2.getHours() + ":" + ("0" + date2.getMinutes()).slice(-2);
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
        $("#tc-begintime").prop(
          "disabled",
          !$("#tc-cbbegintime").prop("checked")
        );
        calcTime();
      });
      $(document).on("click", "#tc-cbbreaktime", function () {
        if (debugMode) console.log("breaktime checkbox click!");
        $("#tc-breaktime").prop(
          "disabled",
          !$("#tc-cbbreaktime").prop("checked")
        );
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
    }
  );

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
        "border-bottom-left-radius": "0",
        "-moz-border-bottom-left-radius": "0",
        "-webkit-border-bottom-left-radius": "0",
        "-o-border-bottom-left-radius": "0",
        "-ms-border-bottom-left-radius": "0",
      });
      $("#tc-finishtime").css({
        "border-bottom-right-radius": "0",
        "-moz-border-bottom-right-radius": "0",
        "-webkit-border-bottom-right-radius": "0",
        "-o-border-bottom-right-radius": "0",
        "-ms-border-bottom-right-radius": "0",
      });

      // 合計時間を置換して、タスクバー表示
      $("#tc-taskbar").append(taskbarhtml);
    } else {
      // プロジェクトが存在しない場合（プロジェクトのページなど）
      // タスクバー非表示
      $("#tc-taskbar").css("display", "none");
      $("#tc-tasknum").css({
        "border-bottom-left-radius": "4px",
        "-moz-border-bottom-left-radius": "4px",
        "-webkit-border-bottom-left-radius": "4px",
        "-o-border-bottom-left-radius": "4px",
        "-ms-border-bottom-left-radius": "4px",
      });
      $("#tc-finishtime").css({
        "border-bottom-right-radius": "4px",
        "-moz-border-bottom-right-radius": "4px",
        "-webkit-border-bottom-right-radius": "4px",
        "-o-border-bottom-right-radius": "4px",
        "-ms-border-bottom-right-radius": "4px",
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
    var taskTime = 0;

    // ラベルから集計
    $(el)
      .find(".task_list_item__info_tags__label")
      .each((i, label) => {
        var labelTmp = $(label).text().replace(timePrefix, "");
        if ($.isNumeric(labelTmp)) taskTime += parseInt(labelTmp);
      });

    // タスクテキストから集計
    var regexp = new RegExp(
      timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, "\\$&") + "(\\d+)",
      "g"
    );
    var textList = $(el).find(".task_content").text().match(regexp);
    if (!textList) return taskTime;
    var len = textList.length;
    for (j = 0; j < len; j++) {
      textTmp = textList[j].replace(timePrefix, "");
      if ($.isNumeric(textTmp)) taskTime += parseInt(textTmp);
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
