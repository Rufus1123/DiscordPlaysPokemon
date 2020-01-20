var pixelmatch = require('pixelmatch');

var postedScreenshot;

exports.isDifferentFromPosted = function(newScreenshot) {
    if (postedScreenshot) {
        return AreDifferentAsync(newScreenshot);
    }

    postedScreenshot = newScreenshot;
    postedScreenshot.data = Buffer.alloc(newScreenshot.data.length, newScreenshot.data);

    return true;
}

function AreDifferentAsync(newScreenshot){
    var width = newScreenshot.width;
    var height = newScreenshot.height;
    var differentPixelsCount = pixelmatch(postedScreenshot.data, newScreenshot.data, null, width, height);
    var equal = differentPixelsCount < width * height / 300;
    if (equal){
        return false;
    } else {
        postedScreenshot = newScreenshot;
        postedScreenshot.data = Buffer.alloc(newScreenshot.data.length, newScreenshot.data);
        return true;
    }
}