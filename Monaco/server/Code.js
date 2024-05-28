// const { text } = require('express')
const {Schema,model} = require('mongoose')


const CodeFile = new Schema({
    _id : String,
    data:Object,
})

module.exports = model("CodeFile",CodeFile)