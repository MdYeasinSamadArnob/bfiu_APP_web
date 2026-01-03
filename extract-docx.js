/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const mammoth = require('mammoth');

const filePath = 'd:\\aml-core\\Docviewer\\BFIU Rules Segregation.docx';

mammoth.extractRawText({path: filePath})
    .then(function(result){
        const text = result.value; 
        const messages = result.messages;
        fs.writeFileSync('extracted-content.txt', text);
        console.log('Text extracted successfully to extracted-content.txt');
        if (messages.length > 0) {
            console.log('Messages:', messages);
        }
    })
    .catch(function(error) {
        console.error('Error extracting text:', error);
    });
