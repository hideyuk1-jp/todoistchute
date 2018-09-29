/**
 * @license TodoistChute
 * (c) 2018 hideyuk1 https://hideyuk1.com
 * License: MIT
 */
$(function() {
  var strall = "指定しない"; //日付を選択しない場合に表示される文字
  var timePrefix = "//"; //見積時間の接頭辞
  var defaultCountMode = "auto";
  var defaultBeginTime = "09:00"; //開始時刻の初期値
  var defaultBreakTime = "01:00"; //休憩時刻の初期値
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
      //挿入される要素
      tchtml = '<div id="tc-wrapper"><div id="tc-tasknum" class="tc-item"><h2>残りタスク</h2><div><span id="tc-cnt">-</span></div></div><div id="tc-totaltime" class="tc-item"><h2>見積時間</h2><div><span id="tc-hour">-</span></div></div><div id="tc-finishtime" class="tc-item"><h2>完了予定</h2><div><span id="tc-endtime">-</span></div></div><div id="tc-settingitems" class="tc-item"> 日付：<select id="tc-date"><option value="ALL">' + strall + '</option></select>　開始時刻：<input type="checkbox" name="chbegintime" id="chbegintime" /><input type="time" name="begintime" id="begintime" value="' + options.tc_begintime + '" disabled />　休憩時間：<input type="checkbox" name="chbreaktime" id="chbreaktime" /><input type="time" name="breaktime" id="breaktime" value="' + options.tc_breaktime + '" disabled /></div><div id="tc-taskbar"></div></div>';

      //フラグがtrueであればリンクアイコンのcssを挿入
      if (options.tc_linkicon == "true") $('head').append('<style type="text/css"><!-- .sel_item_content a.ex_link:after {margin: 0 3px;font-family: FontAwesome;content: "\\f08e";font-size: 100%;} --></style>');

      tc_taskbar = options.tc_taskbar

      //タスクや幅に変更があれば時間計算を実行
      var check = function(tc_countMode) {
        //タスクアイテムが変わったら時間計測を実行
        if (taskContent != $('#content').find('.section_header, .subsection_header, .task_item').text()) {
          //console.log("task_item changed!");
          calcTime(tc_countMode);
          taskContent = $('#content').find('.section_header, .subsection_header, .task_item').text();
          tcWidth = $('#tc-wrapper').width();
          return true;
        }

        //widthが変わったら時間計測を実行
        if (tcWidth != $('#tc-wrapper').width()) {
          //console.log("width changed!");
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
          //console.log("start time changed! " + time1 + "=>" + time2);
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
      labelList, labelTmp,
      textList, textTmp,
      prjnameTmp, prjcolorTmp, taskbarflag,
      taskbar = [];
    var calcStartTime = new Date(),
      calcEndTime;

    //console.log("calcTime run!");

    //印刷画面の時やアクティビティ画面の時は初期化して終了
    if (location.search.match(/print_mode=1/) || location.hash.match(/activity/)) {
      $('#tc-wrapper').remove();
      calcEndTime = new Date();
      //console.log("calc: " + (calcEndTime.getTime() - calcStartTime.getTime()) + "ms");
      return false;
    }

    //#tc-wrapperがない場合は挿入
    if (!($('#tc-wrapper').length)) tcInsert();

    //集計方法が自動選択の場合はラベルの有無で見積時間の集計方法変更
    if (countMode == 'auto') countMode = ($('.labels_holder').length) ? 'label' : 'text';
    //console.log(countMode);

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
      taskList = $('#content').find(".div_due_date:contains('" + tcDateVal + "')" + ".div_due_date:not(:contains('1" + tcDateVal + "'))").closest('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    }

    for (i = 0; i < taskList.length; i++) {
      //見積時間の合計を計算
      taskTimeTmp = 0;
      if (countMode == 'label') { //ラベルから集計
        labelList = $(taskList[i]).find('.label:not(.label_sep)');
        for (j = 0; j < labelList.length; j++) {
          labelTmp = $(labelList[j]).text().replace(timePrefix, '');
          if ($.isNumeric(labelTmp)) taskTimeTmp += parseInt(labelTmp);
        }
      } else if (countMode == 'text') { //タスクテキストから集計
        $(taskList[i]).find('.sel_item_content').contents().each(function(index, element) {
          if (this.nodeType == 3) {
            regexp = new RegExp(timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&') + '\(\\d+\)', 'g');
            textList = $(this).text().match(regexp);
            if (!textList) return false;
            for (j = 0; j < textList.length; j++) {
              textTmp = textList[j].replace(timePrefix, '');
              if ($.isNumeric(textTmp)) taskTimeTmp += parseInt(textTmp);
            }
          }
        });
      }
      taskTime += taskTimeTmp;

      //タスクバーを使用しない場合は次へ
      if (tc_taskbar != "true") continue;

      //タスクバー作成のための処理
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

      //同じプロジェクトが配列にないかチェック
      taskbarflag = false;
      if (taskbarflag) {
        //同じプロジェクトが配列にある場合はカウントを1増やす
        taskbar[j].time += taskTimeTmp;
        taskbar[j].cnt++;
      } else {
        //同じプロジェクトが配列にない場合はカウントは1にして新規追加
        taskbar[taskbar.length] = {
          tasktext: taskText,
          name: prjnameTmp,
          color: prjcolorTmp,
          time: taskTimeTmp,
          id: $(taskList[i]).attr('id'),
          cnt: 1
        }
      }
    }
    taskTimeTmp = taskTime;

    //表示更新
    //残りタスクを更新
    $('#tc-cnt').text(taskList.length);
    //見積時間を更新
    $('#tc-hour').text((taskTime / 60).toFixed(1) + " h");
    //完了予定を更新
    var date = new Date();
    tcCurrentDate = new Date(date.getTime());
    //開始時刻の入力があればdateを更新
    if ($("#begintime").val() != "" && $('#chbegintime').prop('checked')) {
      date = new Date(date.toDateString() + ' ' + $("#begintime").val());
    }
    tcStartDate = new Date(date.getTime());
    //休憩時間の入力があれば加算
    if ($("#breaktime").val() != "" && $('#chbreaktime').prop('checked')) {
      var brhours = $('#breaktime').val().slice(0, 2);
      var brminutes = $('#breaktime').val().slice(-2);
      if ($.isNumeric(brhours)) taskTime += parseInt(brhours) * 60; //時間を加算
      if ($.isNumeric(brminutes)) taskTime += parseInt(brminutes); //分を加算
    }
    //時間計算
    date.setMinutes(date.getMinutes() + taskTime);
    //日をまたぐ数を計算
    var ndate = new Date();
    var ddiff = getDiff(ndate.toDateString(), date.toDateString());
    $('#tc-endtime').text((date.getHours() + ddiff * 24) + ':' + ('0' + date.getMinutes()).slice(-2));
    //タスクバーを更新
    //初期化
    $('#tc-taskbar').empty();
    if (tc_taskbar == "true" && taskbar.length > 0) {
      //プロジェクトが存在する場合
      //タスクバー表示
      $('#tc-taskbar').css('display', '');
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

      var taskbarmode = "time";
      var n = 0;
      var maxtime = 0;
      var maxtimeid = "";
      var taskbarwidth = $('#tc-taskbar').width();
      for (i = 0; i < taskbar.length; i++) {
        if (taskbarmode == "time") {
          var taskcnt = taskbar[i].time;
          var taskcntsum = taskTimeTmp;
        } else if (taskbarmode == "count") {
          var taskcnt = taskbar[i].cnt;
          var taskcntsum = taskList.length;
        }

        if (taskcnt == 0) continue;

        //そのタスクの完了時刻を時間計算
        tcStartDate.setMinutes(tcStartDate.getMinutes() + taskbar[i].time);
        //日をまたぐ数を計算
        ddiff = getDiff(ndate.toDateString(), tcStartDate.toDateString());
        var taskfintime = (tcStartDate.getHours() + ddiff * 24) + ':' + ('0' + tcStartDate.getMinutes()).slice(-2);

        $('#tc-taskbar').append($('<div class="task" data-target="' + taskbar[i].id + '"><div class="taskbar"></div><p class="taskpopup"><span class="taskbar-tasktext">' + taskbar[i].tasktext + '</span> <span class="taskbar-tasktime">' + taskbar[i].time + 'm</span> <span class="taskbar-taskfintime">' + taskfintime + '</span><br /><span class="taskbar-prjname">≪ ' + taskbar[i].name + '</span></p></div>'));
        //barのwidthを指定
        $('#tc-taskbar .task:last').css('width', Math.round(taskbarwidth * taskcnt / taskcntsum));

        //背景色をプロジェクトのカラーに指定
        $('#tc-taskbar div .taskbar:last').css('background-color', taskbar[i].color);

        if (maxtime < taskbar[i].time) {
          maxtime = taskbar[i].time;
          maxtimeid = taskbar[i].id;
        }
        //widthの合計を記録
        n += $('#tc-taskbar .task:last').width();
      }
      //最も時間の長いタスクでwidthを調整
      $('#tc-taskbar .task[data-target="' + maxtimeid + '"]').css('width', $('#tc-taskbar .task[data-target="' + maxtimeid + '"]').width()  + taskbarwidth - n);

      $('#tc-taskbar .taskpopup').each(function() {
        //右端がはみ出していたらその分左にずらす
        $(this).css('display', 'block');
        var p = $(this).offset().left + $(this).outerWidth() - ($(window).scrollLeft() + $(window).width()) + 4;
        if ( p > 0 ) $(this).css('margin-left', -p + "px");
        p = $(this).offset().left - $(window).scrollLeft() - 4;
        if ( p < 0 ) $(this).css('margin-right', p + "px");
        $(this).css('display', '');
      });
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
    //console.log("calc: " + (calcEndTime.getTime() - calcStartTime.getTime()) + "ms");
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

    //日付リストにfocusがある場合は終了
    if ($('#tc-date').is(':focus')) return false;

    //初期化
    mode7days = false;
    $('#tc-date').empty();
    $('#tc-date').append($('<option></option>').val('ALL').text(strall));

    //日付リストを取得
    dateList = $('#content').find('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)').find(".div_due_date .date");

    //次の7日間の場合
    if ($('#next7days').length) {
      mode7days = true;
      dateList = $('.subsection_header__date');
    }

    //日付リストからドロップダウンリストに挿入
    for (i = 0; i < dateList.length; i++) {
      //時刻の部分は消去
      dVal = $(dateList[i]).text().replace(/\d\d:\d\d /g, '');
      //次の7日間の場合は今日とか曜日の部分に変更
      if (mode7days) dVal = $(dateList[i]).prev('a').text();
      //ドロップダウンリストにない日付の場合は挿入
      if (dVal != '' && !($('#tc-date option[value="' + dVal + '"]').length)) $('#tc-date').append($('<option></option>').val(dVal).text(dVal));
    }

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

    //今日、明日、昨日の場合はそのDateを返す
    if (str == "今日") return date;
    if (str == "明日") {
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (str == "昨日") {
      date.setDate(date.getDate() - 1);
      return date;
    }

    //曜日表記の場合、一週間以内の日付で曜日が一致する日付を返す
    if (str.match(/曜日/)) {
      for (i = 0; i < 7; i++) {
        date.setDate(date.getDate() + 1);
        if (str == ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"][date.getDay()]) return date;
      }
    }

    //月日または年月日表記の場合
    //月日の場合は今年として年を追加
    if (!(str.match(/年/))) str = date.getFullYear() + "/" + str;
    //年月日を/に変換
    str = str.replace(/年/g, '/').replace(/月/g, '/').replace(/日/g, '');

    //Dateにして返す
    return new Date(str);
  };

});
