const http = require('http'),
      axios = require('axios'),
      cheerio = require('cheerio'),
      fs = require('fs'),
      request = require('request');
const website = 'http://www.jq22.com/';
const verify = {
    http: /^[(http:)(https:)]/,
    position: /^(.\/)/
};

const start = async function () {
    let pageLength = 10;
    for (let i = 1; i < pageLength; i++) {
        let urlsArray = [];

        //获取列表 每页15条数据
        await axios.get(website + 'jqueryUI-' + i + '-jq')
            .then(function (response) {
                let $ = cheerio.load(response.data);
                $('#zt .m0 .col-lg-4').each(function () {
                    let link = $(this).find('.cover-info a').attr('href');
                    if (link !== undefined) {
                        urlsArray.push(website + link);
                    }
                });
            })
            .catch(function (error) { });


        if (urlsArray.length > 0) {
            //列表中的链接进行爬取
            for (let j = 0; j < urlsArray.length; j++) {
                let caseArray;
                await axios.get(urlsArray[j])
                    .then(function (response) {
                        let $ = cheerio.load(response.data);
                        //查看演示按钮链接
                        let _case = $('.project-content div.thumbile').find('a').first().attr('href');
                        caseArray = _case;
                    })
                    .catch(function (error) { });


                let iframesrc;
                let fileName;
                //爬取查看演示按钮的链接获取到 实例的内容
                await axios.get(caseArray)
                    .then(function (response) {
                        let $ = cheerio.load(response.data);
                        fileName = $('.logoTop').find('a').text();
                        let iframeUrl = $('#iframe').attr('src');
                        iframesrc = iframeUrl;
                    })
                    .catch(function (error) { });

                let cssArray = [],
                    jsArray = [],
                    imgArray = [];
                let iframedata;
                //根据实例中 iframe的链接 拿数据
                await axios.get(iframesrc)
                    .then(function (response) {
                        iframedata = response.data;
                        let $ = cheerio.load(response.data);
                        let title = $('title').text();
                        //获取实例中的 css 文件路径 
                        let cssHref = $('link[rel="stylesheet"]'); //css
                        if (cssHref.length > 0) {
                            cssHref.each(function () {
                                let item = $(this).attr('href')
                                if (item) {
                                    if (!verify.http.test(item)) {
                                        if (verify.position.test(item)) {
                                            item = item.slice(2, item.length);
                                        }
                                        cssArray.push(item);
                                        console.log(title + ' css:' + cssArray);
                                    }
                                }
                            });
                        }
                        //获取实例中的 js 文件路径 
                        let jsHref = $('script'); //js
                        if (jsHref.length > 0) {
                            jsHref.each(function () {
                                let item = $(this).attr('src');
                                if (item) {
                                    if (!verify.http.test(item)) {
                                        if (verify.position.test(item)) {
                                            item = item.slice(2, item.length);
                                        }
                                        jsArray.push(item);
                                        console.log(title + ' js:' + jsArray);
                                    }
                                }
                            });
                        }
                        //获取实例中的图片
                        let imgSrc = $('img');
                        if (imgSrc.length > 0) {
                            imgSrc.each(function () {
                                let item = $(this).attr('src');
                                if (item) {
                                    if (!verify.http.test(item)) {
                                        if (verify.position.test(item)) {
                                            item = item.slice(2, item.length);
                                        }
                                        imgArray.push(item);
                                        console.log(title + ' img:' + imgArray);
                                    }
                                }
                            })
                        }
                    })
                    .catch(function (error) { });

                //新建文件夹
                await creatFile(fileName); //file

                //创建并保存html 文件
                await saveFile(fileName, iframedata, '.html');

                //创建css 文件目录
                await creatFile(fileName, cssArray); //file css

                //创建img 文件目录
                await creatFile(fileName, imgArray); //file css

                //创建js 文件目录
                await creatFile(fileName, jsArray); //file js

                //爬取css
                await findText(fileName, cssArray, 'css', iframesrc);
                //爬取img
                await findText(fileName, imgArray, 'img', iframesrc);
                //爬取js
                await findText(fileName, jsArray, 'js', iframesrc);

            }
        }
        if (i == pageLength - 1) {
            console.log("well down");
        }
    }

}

const findText = async function (fileName, array, type, iframesrc) {
    if (array.length > 0) {
        for (let i = 0; i < array.length; i++) {
            let text = '';
            if(type == "img"){
                let uri = iframesrc + "/" + array[i],
                    file = './jQuery-UI/' + fileName + '/' + array[i];
                console.log("file",file);
                await downloadPic(uri, file, function(){
                    console.log('done');
                });
            }else {
                await axios.get(iframesrc + "/" + array[i])
                .then(response => {
                    text = response.data;
                });
                //创建并保存css
                await saveFile(fileName, text, type, array[i]);
            }
            
        }
    }
}

var downloadPic = async (uri, filename, callback) => {
    request.head(uri, function(err, res, body){
      console.log('content-type:', res.headers['content-type']);
      console.log('content-length:', res.headers['content-length']);
  
      request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

const creatFile = async function (fileName, secondName) {
    if (secondName === undefined) {
        await fs.mkdir('./jQuery-UI/' + fileName, function (err) {
            if (err) {
                // console.log(err);
            }
        });
    } else {
        if (secondName.length > 0) {
            for (let x = 0; x < secondName.length; x++) {
                let split = secondName[x].split('/');
                let path = '';
                for (let y = 0; y < split.length - 1; y++) {
                    path += split[y] + "/";
                    await fs.mkdir('./jQuery-UI/' + fileName + "/" + path, function (err) {
                        if (err) {
                            // console.log(err);
                        }
                    })
                }
            }
        }
    }
}


const saveFile = async function (fileName, data, type, secondName) {
    let file;
    if (secondName === undefined) {
        secondName = fileName;
    }
    if (type !== '.html' || /html$/.test(secondName)) {
        type = ''
    }
    fs.writeFile('./jQuery-UI/' + fileName + '/' + secondName + type, data, "utf-8", function(err){
        if(err){
            console.log(err);
        }
        console.log("down success");
    })
    // file = await fs.createWriteStream('./jQuery-UI/' + fileName + '/' + secondName + type, {
    //     encoding: 'utf-8'
    // });
}

start();