const http = require('http');
const express = require('express');
const MessagingResponse = require('twilio').twiml.MessagingResponse;
const TIE = require('@artificialsolutions/tie-api-client');

const dotenv = require('dotenv');
dotenv.config();
const {
    TENEO_ENGINE_URL,
    PORT
} = process.env;

const teneoApi = TIE.init(TENEO_ENGINE_URL);

// initialise session handler, to store mapping between twillio CallSid and engine session id
const sessionHandler = SessionHandler();

const app = express();

var bodyParser = require('body-parser');

/**
 * Body parser is necessary to correctly parse the body for the sms post method
 */

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

/**
 * Method to handle incoming and sending outcoming text message. Unique identifier is the phone number,
 * as the other IDs change at every SMS transmitted during a session.
 */

app.post('/sms', async (req, res) => {

    const twiml = new MessagingResponse();

    var userInput = req.body.Body;

    const teneoSessionId = sessionHandler.getSession(req.body.From);

    const teneoResponse = await teneoApi.sendInput(teneoSessionId, {'text': userInput});

    sessionHandler.setSession(req.body.From, teneoResponse.sessionId);

    var response_text = teneoResponse.output.text;

    twiml.message(response_text);

    res.writeHead(200, {'Content-Type': 'text/xml'});

    res.end(twiml.toString());
});

/***
 * SESSION HANDLER
 ***/
function SessionHandler() {

    // Map the Twilio phone numberto the teneo engine session id.
    // This code keeps the map in memory, which is ok for testing purposes
    // For production usage it is advised to make use of more resilient storage mechanisms like redis
    const sessionMap = new Map();

    return {
        getSession: (userId) => {
            if (sessionMap.size > 0) {
                return sessionMap.get(userId);
            } else {
                return "";
            }
        },
        setSession: (userId, sessionId) => {
            sessionMap.set(userId, sessionId)
        }
    };
}

/**
 * Initialise the server
 */

http.createServer(app).listen(PORT, () => {
    console.log('Express server listening on port ' + PORT);
});