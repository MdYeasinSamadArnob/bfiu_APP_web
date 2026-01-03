/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('d:\\aml-core\\Docviewer\\BFIU Rules Segregation.pdf');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('extracted-content.txt', data.text);
    console.log('Text extracted successfully to extracted-content.txt');
    console.log('Number of pages:', data.numpages);
    console.log('Info:', JSON.stringify(data.info));
}).catch(function(error){
    console.error('Error extracting text:', error);
});
