require("dotenv").config();
var fetch = require('isomorphic-fetch'); // or another library of choice.
var Dropbox = require('dropbox').Dropbox;
const path = process.env.DropboxSavesLocation;

const dropbox = new Dropbox({
    accessToken: process.env.DropboxToken,
    fetch: fetch
});

exports.downloadFile = async function (file){
    var downloadResult = await dropbox.filesDownload({
        path: path + file
    }); 

    return downloadResult.fileBinary;
}

exports.uploadFile = async function (data, file){
    return await dropbox.filesUpload({
        contents: data,
        path: path + file,
        mode: "overwrite"
    });
}