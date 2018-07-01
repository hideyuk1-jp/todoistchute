$(function() {
  var strall = "指定しない"; //日付を選択しない場合に表示される文字
  var timePrefix = "//"; //見積時間の接頭辞
  var countMode = "auto";
  var defaultBeginTime = "09:00"; //開始時刻の初期値
  var defaultBreakTime = "01:00"; //休憩時刻の初期値
  var tchtml;

  //設定をchrome.storageから読込
  chrome.storage.sync.get(
    {
      tc_countMode: countMode,
      tc_begintime: defaultBeginTime,
      tc_breaktime: defaultBreakTime
    },
    function(options) {
      console.log(options);
      if (options.tc_countMode) countMode = options.tc_countMode;

      //挿入される要素
      tchtml = '<div id="tc"><div id="item1" class="tc-item"><h2>残りタスク</h2><div><span id="tc-cnt">-</span></div></div><div id="item2" class="tc-item"><h2>見積時間</h2><div><span id="tc-hour">-</span></div></div><div id="item3" class="tc-item"><h2>完了予定</h2><div><span id="tc-endtime">-</span></div></div><div id="item4" class="tc-item"> 日付：<select id="tc-date"><option value="ALL">' + strall + '</option></select>　開始時刻：<input type="checkbox" name="chbegintime" id="chbegintime" /><input type="time" name="begintime" id="begintime" value="' + options.tc_begintime + '" disabled />　休憩時間：<input type="checkbox" name="chbreaktime" id="chbreaktime" /><input type="time" name="breaktime" id="breaktime" value="' + options.tc_breaktime + '" disabled /></div><div id="item5"></div></div>';

      //時間計算を実行
      calcTime();

      //1秒おきに時間計算を実行
      setInterval(calcTime, 1000);

      //開始時刻や休憩時間のチェックボックスがクリックされた時
      $('#chbegintime').click(function() {
        $('#begintime').prop('disabled', !($('#chbegintime').prop('checked')));
        calcTime();
      });
      $('#chbreaktime').click(function() {
        $('#breaktime').prop('disabled', !($('#chbreaktime').prop('checked')));
        calcTime();
      });
    }
  );

  //時間計測
  function calcTime() {
    var taskList,
      taskTime = 0,
      i, j,
      labelList, labelTmp,
      textList, textTmp,
      prjcolorTmp, prjbarflag,
      prjbar = [];
    var calcStartTime = new Date(),
      calcEndTime;

    //印刷画面の時やアクティビティ画面の時は初期化して終了
    if (location.search.match(/print_mode=1/) || location.hash.match(/activity/)) {
      $('#tc').remove();
      calcEndTime = new Date();
      //console.log("calc: " + (calcEndTime.getTime() - calcStartTime.getTime()) + "ms");
      return false;
    }

    //#tcがない場合は挿入
    if (!($('#tc').length)) tcInsert();

    //集計方法が自動の場合はラベルの有無で見積時間の集計方法変更
    if (countMode =='auto') {
      if ($('.labels_holder').length) countMode = 'label';
      else countMode = 'text';
    }

    //日付リスト作成
    getDateList();

    //タスクリストの取得
    taskList = $('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    if (mode7days == 1 && tcDateVal != 'ALL') {
      //次の7日間で日付指定の場合
      taskList = $(".subsection_header > a:contains('" + tcDateVal + "')").closest('div').next('ul').find('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    } else if (tcDateVal != 'ALL') {
      //次の7日間以外で日付指定の場合
      taskList = $(".div_due_date:contains('" + tcDateVal + "')" + ".div_due_date:not(:contains('1" + tcDateVal + "'))").closest('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)');
    }

    for (i = 0; i < taskList.length; i++) {
      //見積時間の合計を計算
      if (countMode == 'label') { //ラベルから集計
        labelList = $(taskList[i]).find('.label:not(.label_sep)');
        for (j = 0; j < labelList.length; j++) {
          labelTmp = $(labelList[j]).text().replace(timePrefix, '');
          if ($.isNumeric(labelTmp)) taskTime += parseInt(labelTmp);
        }
      } else if (countMode == 'text') { //タスクテキストから集計
        $(taskList[i]).find('.sel_item_content').contents().each(function(index, element) {
          if (this.nodeType == 3) {
            regexp = new RegExp(timePrefix.replace(/[\\^$.*+?()[\]{}|/]/g, '\\$&') + '\(\\d+\)', 'g');
            textList = $(this).text().match(regexp);
            if (!textList) return false;
            for (j = 0; j < textList.length; j++) {
              textTmp = textList[j].replace(timePrefix, '');
              if ($.isNumeric(textTmp)) taskTime += parseInt(textTmp);
            }
          }
        });
      }
      //プロジェクトカラーと数の取得
      prjcolorTmp = $(taskList[i]).find('.project_item__color').css('background-color');

      //プロジェクトカラーが取得出来ない場合は次へ
      if (!prjcolorTmp) continue;

      //同じカラーが配列にないかチェック
      prjbarflag = false;
      for (j = 0; j < prjbar.length; j++) {
        if (prjbar[j].color == prjcolorTmp) {
          prjbarflag = true;
          break;
        }
      }
      if (prjbarflag) {
        //同じカラーが配列にある場合はカウントを1増やす
        prjbar[j].cnt++;
      } else {
        //同じカラーが配列にない場合はカウントは1にして追加
        prjbar[prjbar.length] = {
          color: prjcolorTmp,
          cnt: 1
        }
      }
    }

    //表示更新
    //残りタスクを更新
    $('#tc-cnt').text(taskList.length);
    //見積時間を更新
    $('#tc-hour').text((taskTime / 60).toFixed(1) + " h");
    //完了予定を更新
    var date = new Date();
    //開始時刻の入力があればdateを更新
    if ($("#begintime").val() != "" && $('#chbegintime').prop('checked')) {
      date = new Date(date.toDateString() + ' ' + $("#begintime").val());
    }
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
    //プロジェクトバーを更新
    //初期化
    $('#item5').empty();
    if (prjbar.length > 0) {
      //プロジェクトカラーが存在する場合
      //プロジェクトバー表示
      $('#item5').css('display', '');
      $('#item1').css({
        'border-bottom-left-radius': '0',
        '-moz-border-bottom-left-radius': '0',
        '-webkit-border-bottom-left-radius': '0',
        '-o-border-bottom-left-radius': '0',
        '-ms-border-bottom-left-radius': '0'
      });
      $('#item3').css({
        'border-bottom-right-radius': '0',
        '-moz-border-bottom-right-radius': '0',
        '-webkit-border-bottom-right-radius': '0',
        '-o-border-bottom-right-radius': '0',
        '-ms-border-bottom-right-radius': '0'
      });

      var n = 0.00;
      for (i = 0; i < prjbar.length; i++) {
        $('#item5').append($("<div></div>"));
        //barのwidthを指定
        $('#item5 div:last').css('width', (Math.floor(prjbar[i].cnt / taskList.length * 100 * 1000) / 1000) + '%');
        //最後のbarのwidthは合計100%になるように指定
        if (i == prjbar.length - 1) $('#item5 div:last').css('width', (100.00 - n) + '%');
        //背景色をプロジェクトカラーに指定
        $('#item5 div:last').css('background-color', prjbar[i].color);
        //widthの合計を記録
        n += (Math.floor(prjbar[i].cnt / taskList.length * 100 * 1000) / 1000);
      }
    } else {
      //プロジェクトカラーが存在しない場合（プロジェクトのページなど）
      //プロジェクトバー非表示
      $('#item5').css('display', 'none');
      $('#item1').css({
        'border-bottom-left-radius': '4px',
        '-moz-border-bottom-left-radius': '4px',
        '-webkit-border-bottom-left-radius': '4px',
        '-o-border-bottom-left-radius': '4px',
        '-ms-border-bottom-left-radius': '4px'
      });
      $('#item3').css({
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
    $('#tc').remove();
    //html挿入
    $('#content').prepend(tchtml);
  };

  //日付リストの作成
  var dateList;
  var mode7days;
  var tcDateVal;

  function getDateList() {
    var i, j, dval;

    //現在選択中の日付を退避
    tcDateVal = $('#tc-date').val();

    //日付リストにfocusがある場合は終了
    if ($('#tc-date').is(':focus')) return false;

    //初期化
    mode7days = false;
    $('#tc-date').empty();
    $('#tc-date').append($('<option></option>').val('ALL').text(strall));

    //日付リストを取得
    dateList = $('.task_item:not(.checked,.history_item,.reorder_item)' + '.task_item:has(.checker)').find(".div_due_date .date");

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
