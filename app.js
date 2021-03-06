/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'); // app server
var bodyParser = require('body-parser'); // parser for post requests
var AssistantV1 = require('watson-developer-cloud/assistant/v1'); // watson sdk

var app = express();

// Bootstrap application settings
app.use(express.static('./public')); // load UI from public folder
app.use(bodyParser.json());

// Create the service wrapper

var assistant;

if (process.env.ASSISTANT_IAM_APIKEY && process.env.ASSISTANT_IAM_APIKEY != '') {
  assistant = new AssistantV1({
    version: '2018-02-16',
    url: process.env.ASSISTANT_URL || '<service-url>',
    iam_apikey: process.env.ASSISTANT_IAM_APIKEY || '<iam_apikey>',
    iam_url: process.env.ASSISTANT_IAM_URL || 'https://iam.bluemix.net/identity/token',
  });
} else {
  assistant = new AssistantV1({
    version: '2018-07-18',
    url: process.env.ASSISTANT_URL || '<service-url>',
    username: process.env.ASSISTANT_USERNAME || '<username>',
    password: process.env.ASSISTANT_PASSWORD || '<password>',
  });
}

let token ="EAAEEALYeNyYBAFmFin0dl68kPOgupsNeJqmNZCtrjTpAx4fIGTGO7n7FOW6ZBFHhfIBVXx1ibg84aDtqwXqBn1Ro5hbZCCnHU9Eetis6jKrn16xzwzQtLPSYf2bN31fRcKQ9hXxbVUZAuidApB5QZBZCztZB6PUbcc7BmrC2nUsvAZDZD";

app.get('/api/webhook/', function (req, res) {
	if(req.query['hub.verify_token']==="cocoa"){
		res.send(req.query['hub.challenge']);
	}
	res.send("wrong token");
});

app.post('/api/webhook/', function (req, res) {
	let m_events = req.body.entry[0].messaging_events
	for(let i = 0;i< m_events.length; i++ ){
		let evt = m_events[i];
		let sender = evt.sender.id
		if(evt.message && evt.message.text){
			let txt = evt.message.text
			sendText(sender,"Text echo:"+txt.substring(0,100))
		}
	}
	res.sendStatus(200)
});

function sendText(sender,text){
	let m_data = {text:text}
	request({
		url:"",
		qs:{access_token:token},
		method:"POST",
		json:{
			recipient:{id:sender},
			message:m_data
		}
		},function(err,resp,body){
				if(err){
					console.log("sending error")
				}else if(resp.body.error){
					console.log("response body error")
				}
		});
}


// Endpoint to be call from the client side
app.post('/api/message', function (req, res) {
  var workspace = process.env.WORKSPACE_ID || '<workspace-id>';
  if (!workspace || workspace === '<workspace-id>') {
    return res.json({
      'output': {
        'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/assistant-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
      }
    });
  }
  var payload = {
    workspace_id: workspace,
    context: req.body.context || {},
    input: req.body.input || {}
  };

  // Send the input to the assistant service
  assistant.message(payload, function (err, data) {
    if (err) {
      return res.status(err.code || 500).json(err);
    }
    return res.json(updateMessage(payload, data));
  });
});

/**
 * Updates the response text using the intent confidence
 * @param  {Object} input The request to the Assistant service
 * @param  {Object} response The response from the Assistant service
 * @return {Object}          The response with the updated message
 */
function updateMessage(input, response) {
  var responseText = null;
  if (!response.output) {
    response.output = {};
  } else {
    return response;
  }
  if (response.intents && response.intents[0]) {
    var intent = response.intents[0];
    // Depending on the confidence of the response the app can return different messages.
    // The confidence will vary depending on how well the system is trained. The service will always try to assign
    // a class/intent to the input. If the confidence is low, then it suggests the service is unsure of the
    // user's intent . In these cases it is usually best to return a disambiguation message
    // ('I did not understand your intent, please rephrase your question', etc..)
    if (intent.confidence >= 0.75) {
      responseText = 'I understood your intent was ' + intent.intent;
    } else if (intent.confidence >= 0.5) {
      responseText = 'I think your intent was ' + intent.intent;
    } else {
      responseText = 'I did not understand your intent';
    }
  }
  response.output.text = responseText;
  return response;
}

module.exports = app;
