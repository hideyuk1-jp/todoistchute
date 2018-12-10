/**
 * @license TodoistChute
 * (c) 2018 hideyuk1 https://hideyuk1.com
 * License: MIT
 */
$(function() {
  var strall = chrome.i18n.getMessage("allDate"); //日付を選択しない場合に表示される文字
  var timePrefix = "//"; //見積時間の接頭辞
  var defaultCountMode = "auto";
  var defaultBeginTime = "09:00"; //開始時刻の初期値
  var defaultBreakTime = "1"; //休憩時間の初期値
  var defaultLinkIcon = "false"; //リンクアイコン挿入の初期値
  var defaultTaskBar = "true"; //タスクバー使用の初期値
  var tchtml;

  var tcCurrentDate = new Date();
  var tcStartDate;

  var taskContent = null;
  var tcWidth = null;

  var tc_taskbar;

  //fontawesome挿入
  $('head').append('<link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet">');

  //設定をchrome.storageから読込
  chrome.storage.sync.get(
    {
      tc_countMode: defaultCountMode,
      tc_begintime: defaultBeginTime,
      tc_breaktime: defaultBreakTime,
      tc_linkicon: defaultLinkIcon,
      tc_taskbar: defaultTaskBar
    },
    function(options) {
      //休憩時間がhh:mm形式の場合
      var brtime = options.tc_breaktime.match(/^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/);
      if (brtime) options.tc_breaktime = Math.round((parseFloat(brtime[1]) + parseFloat(brtime[2]) / 60)*100)/100;

      //挿入される要素
      tchtml = '<div id="tc-wrapper"><div id="tc-tasknum" class="tc-item"><h2>' + chrome.i18n.getMessage("remainedTaskName") + '</h2><div><span id="tc-cnt">-</span></div></div><div id="tc-totaltime" class="tc-item"><h2>' + chrome.i18n.getMessage("totalTimeName") + '</h2><div><span id="tc-hour">-</span></div></div><div id="tc-finishtime" class="tc-item"><h2>' + chrome.i18n.getMessage("finishTimeName") + '</h2><div><span id="tc-endtime">-</span></div></div><div id="tc-settingitems" class="tc-item"> ' + chrome.i18n.getMessage("dateSelectName") + ': <select id="tc-date"><option value="ALL">' + strall + '</option></select>　' + chrome.i18n.getMessage("startTimeName") + ': <input type="checkbox" name="chbegintime" id="chbegintime" /><input type="time" name="begintime" id="begintime" value="' + options.tc_begintime + '" disabled />　' + chrome.i18n.getMessage("breakTimeName") + ': <input type="checkbox" name="chbreaktime" id="chbreaktime" /><input type="number" step="0.01" name="breaktime" id="breaktime" value="' + options.tc_breaktime + '" disabled /> h</div><div id="tc-taskbar" style="display:flex"></div></div>';

      //フラグがtrueであればリンクアイコンのcssを挿入
      if (options.tc_linkicon == "true") $('head').append('<style type="text/css"><!-- .sel_item_content a.ex_link:after {margin: 0 3px;font-family: FontAwesome;content: "\\f08e";font-size: 100%;} --></style>');

      tc_taskbar = options.tc_taskbar

      //タスクや幅に変更があれば時間計算を実行
      var check = function(tc_countMode) {
        //タスクアイテムが変わったら時間計測を実行
        if (taskContent != $('#content').find('.section_header, .subsection_header, .task_item').text()) {
          calcTime(tc_countMode);
          taskContent = $('#content').find('.section_header, .subsection_header, .task_item').text();
          tcWidth = $('#tc-wrapper').width();
          return true;
        }

        //widthが変わったら時間計測を実行
        if (tcWidth != $('#tc-wrapper').width()) {
          calcTime(tc_countMode);
          taskContent = $('#content').find('.section_header, .subsection_header, .task_item').text();
          tcWidth = $('#tc-wrapper').width();
          return true;
        }

        //現在時刻が変わったら時間計測を実行
        var time1 = tcCurrentDate.getHours() + ':' + ('0' + tcCurrentDate.getMinutes()).slice(-2);
        var date2 = new Date();
        var time2 = date2.getHours() + ':' + ('0' + date2.getMinutes()).slice(-2);
        if (time1 != time2) {
          calcTime(tc_countMode);
          return true;
        }
      };
      //1秒おきに時間計算を実行
      setInterval(function(){check(options.tc_countMode)}, 1000);

      //日付が変更された時
      $('#content').on('change','#tc-date',function() {calcTime(options.tc_countMode)});

      //開始時刻や休憩時間が変更された時
      $('#content').on('change','#begintime',function() {calcTime(options.tc_countMode)});
      $('#content').on('change','#breaktime',function() {calcTime(options.tc_countMode)});

      //開始時刻や休憩時間のチェックボックスがクリックされた時
      $('#content').on('click','#chbegintime',function() {
        $('#begintime').prop('disabled', !($('#chbegintime').prop('checked')));
        calcTime(options.tc_countMode);
      });
      $('#content').on('click','#chbreaktime',function() {
        $('#breaktime').prop('disabled', !($('#chbreaktime').prop('checked')));
        calcTime(options.tc_countMode);
      });

      //開始時刻や休憩時間のチェックボックスがクリックされた時
      $('#content').on('click','#tc-taskbar .task',function() {
        $("html,body").scrollTop($('#' + $(this).data('target')).offset().top - $('#top_bar').height());
      });
    }
  );

  //時間計測
  function calcTime(countMode) {
    var taskList,
      taskTime = 0,
      taskTimeTmp,
      i, j,
      len, len2,
      labelList, labelTmp,
      textList, textTmp,
      prjnameTmp, prjcolorTmp,
      taskbar = [];
    var calcStartTime = new Date(),
      calcEndTime;

    //印刷画面の時やアクティビティ画面の時は初期化して終了
    if (location.search.match(/print_mode=1/) || location.hash.match(/activity/)) {
      $('#tc-wrapper').remove();
      calcEndTime = new Date();
      return false;
    }

    //#tc-wrapperがない場合は挿入
    if (!($('#tc-wrapper').length)) tcInsert();

    //集計方法が自動選択の場合はラベルの有無で見積時間の集計方法変更
    if (countMode == 'auto') countMode = ($('.labels_holder').length) ? 'label' : 'text';

    //日付リスト作成
    getDateList();
    var tcDateVal = $('#tc-date').val();

    //タスクリストの取得
    taskList = $('#content').find('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    if (mode7days == 1 && tcDateVal != 'ALL') {
      //次の7日間で日付指定の場合
      taskList = $('#content').find(".subsection_header > a:contains('" + tcDateVal + "')").closest('div').next('ul').find('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    } else if (tcDateVal != 'ALL') {
      //次の7日間以外で日付指定の場合
      taskList = $('#content').find(".date:contains('" + tcDateVal + "')" + ".date:not(:contains('1" + tcDateVal + "'))").closest('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    }

    //dateの準備
    var date = new Date();
    tcCurrentDate = new Date(date.getTime());
    //開始時刻の入力があればdateを更新
    if ($("#begintime").val() != "" && $('#chbegintime').prop('checked')) {
      date = new Date(date.toDateString() + ' ' + $("#begintime").val());
    }
    tcStartDate = new Date(date.getTime());

    var taskbarhtml = '';

    len = taskList.length;
    for (i = 0; i < len; i++) {
      //見積時間の合計を計算
      taskTimeTmp = 0;
      if (countMode == 'label') { //ラベルから集計
        labelList = $(taskList[i]).find('.label:not(.label_sep)');
        len2 = labelList.length;
        for (j = 0; j < len2; j++) {
          labelTmp = $(labelList[j]).text().replace(timePrefix, '');
          if ($.isNumeric(labelTmp)) taskTimeTmp += parseInt(labelTmp);
        }
      } else if (countMode == 'text') { //タスクテキストから集計
        $(taskList[i]).find('.sel_item_content').contents().each(function(index, element) {
          if (this.nodeType == 3) {
            regexp = new RegExp(timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&') + '\(\\d+\)', 'g');
            textList = $(this).text().match(regexp);
            if (!textList) return false;
            len2 = textList.length;
            for (j = 0; j < len2; j++) {
              textTmp = textList[j].replace(timePrefix, '');
              if ($.isNumeric(textTmp)) taskTimeTmp += parseInt(textTmp);
            }
          }
        });
      }
      taskTime += taskTimeTmp;

      //タスクバーを使用しない場合は次へ
      if (tc_taskbar != "true") continue;

      //タスクテキスト取得
      taskText = "";
      $(taskList[i]).find('.sel_item_content').contents().each(function(){
        if ($(this).hasClass('note_icon')) return false;
        taskText += $(this).text();
      });

      //プロジェクトの名前とカラー取得
      prjnameTmp = $(taskList[i]).find('.project_item__name').text();
      prjcolorTmp = $(taskList[i]).find('.project_item__color').css('background-color');

      //取得出来ない場合は次へ
      if (!prjnameTmp || !prjcolorTmp) continue;

      if (taskTimeTmp <= 0) continue;

      //そのタスクの完了時刻を時間計算
      tcStartDate.setMinutes(tcStartDate.getMinutes() + taskTimeTmp);
      //日をまたぐ数を計算
      var ndate = new Date();
      ddiff = getDiff(ndate.toDateString(), tcStartDate.toDateString());
      var taskfintime = (tcStartDate.getHours() + ddiff * 24) + ':' + ('0' + tcStartDate.getMinutes()).slice(-2);

      taskbarhtml += '<div class="task" style="flex:' + taskTimeTmp + '" data-target="' + $(taskList[i]).attr('id') + '"><div class="taskbar" style="background-color:' + prjcolorTmp + '"></div><p class="taskpopup"><span class="taskbar-tasktext">' + taskText + '</span> <span class="taskbar-tasktime">' + taskTimeTmp + 'm</span> <span class="taskbar-taskfintime">' + taskfintime + '</span><br /><span class="taskbar-prjname">≪ ' + prjnameTmp + '</span></p></div>';
    }
    taskTimeTmp = taskTime;

    calcPreDisplayTime = new Date();

    //表示更新
    //残りタスクを更新
    $('#tc-cnt').text(taskList.length);
    //見積時間を更新
    $('#tc-hour').text((taskTime / 60).toFixed(1) + " h");
    //完了予定を更新
    //休憩時間の入力があれば加算
    if ($("#breaktime").val() != "" && $('#chbreaktime').prop('checked')) {
      var brtime = $('#breaktime').val().match(/^(0?[0-9]|1[0-9]|2[0-4]):(0?[0-9]|[1-5][0-9])$/);
      if (brtime) {
        var brhours = brtime[1];
        var brminutes = brtime[2];
        if ($.isNumeric(brhours)) taskTime += parseInt(brhours) * 60; //時間を加算
        if ($.isNumeric(brminutes)) taskTime += parseInt(brminutes); //分を加算
      } else if ($.isNumeric($("#breaktime").val())) {
        taskTime += parseInt(parseFloat($("#breaktime").val()) * 60);
      }
    }
    //時間計算
    date.setMinutes(date.getMinutes() + taskTime);
    //日をまたぐ数を計算
    var ndate = new Date();
    var ddiff = getDiff(ndate.toDateString(), date.toDateString());
    $('#tc-endtime').text((date.getHours() + ddiff * 24) + ':' + ('0' + date.getMinutes()).slice(-2));

    calcPreTaskbarTime = new Date();

    //タスクバーを更新
    //初期化
    $('#tc-taskbar').empty();
    if (tc_taskbar == "true" && taskbarhtml != '') {
      //プロジェクトが存在する場合
      //タスクバー表示
      $('#tc-taskbar').css('display', 'flex');
      $('#tc-tasknum').css({
        'border-bottom-left-radius': '0',
        '-moz-border-bottom-left-radius': '0',
        '-webkit-border-bottom-left-radius': '0',
        '-o-border-bottom-left-radius': '0',
        '-ms-border-bottom-left-radius': '0'
      });
      $('#tc-finishtime').css({
        'border-bottom-right-radius': '0',
        '-moz-border-bottom-right-radius': '0',
        '-webkit-border-bottom-right-radius': '0',
        '-o-border-bottom-right-radius': '0',
        '-ms-border-bottom-right-radius': '0'
      });

      //合計時間を置換して、タスクバー表示
      $('#tc-taskbar').append(taskbarhtml);

    } else {
      //プロジェクトが存在しない場合（プロジェクトのページなど）
      //タスクバー非表示
      $('#tc-taskbar').css('display', 'none');
      $('#tc-tasknum').css({
        'border-bottom-left-radius': '4px',
        '-moz-border-bottom-left-radius': '4px',
        '-webkit-border-bottom-left-radius': '4px',
        '-o-border-bottom-left-radius': '4px',
        '-ms-border-bottom-left-radius': '4px'
      });
      $('#tc-finishtime').css({
        'border-bottom-right-radius': '4px',
        '-moz-border-bottom-right-radius': '4px',
        '-webkit-border-bottom-right-radius': '4px',
        '-o-border-bottom-right-radius': '4px',
        '-ms-border-bottom-right-radius': '4px'
      });
    }

    calcEndTime = new Date();
    console.log("Total: " + (calcEndTime.getTime() - calcStartTime.getTime()) + "ms (Calc: " + (calcPreDisplayTime.getTime() - calcStartTime.getTime()) + "ms) (Display: " + (calcPreTaskbarTime.getTime() - calcPreDisplayTime.getTime()) + "ms) (Taskbar: " + (calcEndTime.getTime() - calcPreTaskbarTime.getTime()) + "ms)");
  };

  //TodoistChute挿入
  function tcInsert() {
    //初期化
    $('#tc-wrapper').remove();
    //html挿入
    $('#content').prepend(tchtml);
  };

  //日付リストの作成
  var dateList;
  var mode7days;
  var tcDateVal;

  function getDateList() {
    var i, j, dval, tcDateVal;

    //現在選択中の日付を退避
    tcDateVal = $('#tc-date').val();

    //初期化
    mode7days = false;
    $('#tc-date').empty();
    $('#tc-date').append($('<option></option>').val('ALL').text(strall));

    //日付リストを取得
    dateList = $('#content').find('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)').find(".date");

    //次の7日間の場合
    if ($('#next7days').length) {
      mode7days = true;
      dateList = $('.subsection_header__date');
    }

    //日付リストからドロップダウンリストに挿入
    len = dateList.length;
    var dvalhtml = '';
    for (i = 0; i < len; i++) {
      //時刻の部分は消去
      dVal = $(dateList[i]).text().replace(/\d\d:\d\d/g, '').trim();
      //次の7日間の場合は今日とか曜日の部分に変更
      if (mode7days) dVal = $(dateList[i]).prev('a').text();
      //ドロップダウンリストにない日付の場合は挿入
      reg = new RegExp('<option value="' + dVal + '">');
      if (dVal != '' && !(dvalhtml.match(reg))) dvalhtml += '<option value="' + dVal + '">' + dVal + '</option>';
    }
    $('#tc-date').append(dvalhtml);

    //日付順にソート
    $("#tc-date").html($('#tc-date option').sort(function(a, b) {
      return getDateFromStr($(a).text()).getTime() > getDateFromStr($(b).text()).getTime() ? 1 : -1;
    }));

    //選択を戻す
    $('#tc-date').val(tcDateVal);

    //選択肢がなければALLにする
    if (!$('#tc-date').val()) {
      $('#tc-date').val('ALL');
    }
  };

  //日付の差分日数を返す
  function getDiff(date1Str, date2Str) {
    var date1 = new Date(date1Str);
    var date2 = new Date(date2Str);

    //２つの日付の差（ミリ秒）を求める
    var msDiff = date2.getTime() - date1.getTime();

    //求めた差分（ミリ秒）を日数へ変換
    var daysDiff = Math.floor(msDiff / (1000 * 60 * 60 * 24));

    //差分日数を返す
    return daysDiff;
  };

  //今日や土曜日などの文字列をdateで変換して返す（変換失敗時は："Invalid Date"）
  function getDateFromStr(str) {
    var date = new Date();

    //指定しないの場合
    if (str == strall) return new Date("1900/1/1");

    //今日、明日、昨日の場合はそのDateを返す
    if (str == "今日" || str == "Today") return date;
    if (str == "明日" || str == "Tomorrow") {
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (str == "昨日" || str == "Yesterday") {
      date.setDate(date.getDate() - 1);
      return date;
    }

    //曜日表記の場合、一週間以内の日付で曜日が一致する日付を返す
    if (str.match(/曜日/) || str.match(/day/)) {
      for (i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        var japaneseDay = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
        var englishDay = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        if (str == japaneseDay[date.getDay()] || str == englishDay[date.getDay()]) return date;
      }
    }

    //年月日表記の場合
    if (str.match(/(\d{4})年([1-9]|1[012])月([1-9]|[12][0-9]|3[01])日/)) {
      str = str.replace(/年/g, '/').replace(/月/g, '/').replace(/日/g, '');
      //Dateにして返す
      return new Date(str);
    }
    //英語表記の年月日の場合
    if(str.match(/([1-9]|[12][0-9]|3[01]) (\D{3}) (\d{4})/))  return new Date(str);

    //月日の場合は今年として年を追加
    if (str.match(/([1-9]|1[012])月([1-9]|[12][0-9]|3[01])日/)) {
      str = date.getFullYear() + "/" + str;
      str = str.replace(/年/g, '/').replace(/月/g, '/').replace(/日/g, '');
      //Dateにして返す
      return new Date(str);
    }
    //英語表記の月日の場合
    if(str.match(/([1-9]|[12][0-9]|3[01]) (\D{3})/)) return new Date(str + " " + date.getFullYear());

    //Dateにして返す
    return new Date(str);
  };

});
