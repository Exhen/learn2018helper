// ==UserScript==
// @name         网络学堂2018助手
// @namespace    exhen32@live.com
// @version      2019年2月27日01版
// @description  微调排版，提醒更醒目
// @require      http://cdn.bootcss.com/jquery/3.2.1/jquery.min.js
// @require      https://cdn.bootcss.com/jqueryui/1.12.1/jquery-ui.min.js
// @author       Exhen
// @match        http*://learn2018.tsinghua.edu.cn/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      learn2018.tsinghua.edu.cn
// @run-at       document-idle
// ==/UserScript==

var getJSON = function (url, callback) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: url,
        headers: {
            'Accept': 'application/json'
        },
        onload: function (response) {
            if (response.status >= 200 && response.status < 400) {
                callback(JSON.parse(response.responseText), url);
            } else {
                callback(false, url);
            }
        }
    });
};

function init(){
    console.log('网络学堂2018助手 is running!')
        // 新通知数量重新排版
        $('.unsee').remove();
        $('li.clearfix').each(function () {
            $(this).css('height', '90px')
            $(this).css('padding', '8px 8px')
            if (parseInt($(this).find('span.stud').text()) > 0) {
                $(this).find('span.stud').css('font-size', '50px');
                $(this).find('span.stud').css('display', 'block');
                $(this).find('span.stud').css('padding-left', 'none');
                $(this).find('span.stud').css('text-align', 'center');
                //$(this).find('span.name').text($(this).find('span.liulan').text());
                $(this).find('span.liulan').remove();
            } else {
                $(this).find('span.stud').remove();
            }

        })
        $('ul.stu').each(function () {
            $(this).find('li').first().css('padding', '0px');
        })

        // 图片提醒
        $('dd.clearfix').each(function () {
            if (parseInt($(this).find('span.green').text()) > 0) {
                var wlkcid = $(this).find('.hdtitle a').attr('href').match(/(?<=wlkcid=).*/);
                $(this).attr('id', wlkcid)
                getJSON(`http://learn2018.tsinghua.edu.cn/b/wlxt/kczy/zy/student/index/zyListWj?wlkcid=${wlkcid}&size=99`, function (doc, url) {
                    if (doc) {
                        var ddl = 0;
                        for (var i = 0; i < doc.object.iTotalRecords; i++) {
                            if (ddl <= 0 || ddl > doc.object.aaData[i].jzsj) {
                                ddl = doc.object.aaData[i].jzsj
                            }
                        }
                        console.log(ddl)
                        var now = new Date();
                        var time = ddl - now.getTime();
                        console.log(time)
                        var days = Math.ceil(time / 86400000);
                        if (time <= 0) {
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/liangle.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding: 10px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">已经截至</span>`)
                        } else if (time <= 86400000) { //多于7天
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/ddl.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding: 10px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">最后一天</span>`)
                        } else {
                            $(`#${wlkcid}`).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/ddl.jpg)');
                            $(`#${wlkcid}`).find('li.clearfix').first().append(`<span style="color: red;font-size: 16px;padding: 10px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">还剩<span style="text-align: center;">${days}</span>天</span>`)
                        }
                        $(`#${wlkcid}`).find('p.p_img').remove();
                    }
                })
            } else {
                $(this).find('li.clearfix').first().css('background', 'url(https://raw.githubusercontent.com/Exhen/learn2018helper/master/good.jpg)');
                $(this).find('li.clearfix').first().append(`<span style="color: black;font-size: 16px;padding: 10px 18px;line-height: 18px;width: 18px;text-align: center;display: block;float: right;">没有作业</span>`)
                $(this).find('p.p_img').remove();
            }
        })
}

window.addEventListener('load', function() {
init();
})
