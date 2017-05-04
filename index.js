var restify = require('restify');
var builder = require('botbuilder');
var request = require('request');

const DIALOG_ROOT = '/root';
const DIALOG_MENU = '/menu';
const DIALOG_TRIVIA = '/trivia';

const URL_LOGO_TDC = 'http://s3-sa-east-1.amazonaws.com/website-systextil/wp-content/uploads/20160225190252/thedeconf-e1455217447553-495x480.png';
const URL_LINK_TDC = 'http://www.thedevelopersconference.com.br/';
const URL_TRIVIA_API = 'https://opentdb.com/api.php?amount=1&type=multiple';

const CARD_TITLE = 'The Developers Conference';
const CARD_TEXT = 'Florianópolis, 2017';

const MENU_OPTIONS = 'Give me a trivia | Quit';
const MENU_LABEL = 'Choose an option:';
const MENU_ITEM_TRIVIA = 0;
const MENU_ITEM_QUIT = 1;

// Setup Restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create connector
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Create bot configuring the first dialog
var bot = new builder.UniversalBot(connector, [
    function (session) {
        session.beginDialog(DIALOG_ROOT);
    },
    function (session, results) {
        session.endConversation("Goodbye!");
    }
]);

// Publish the Bot Service
server.post('/api/messages', connector.listen());

//=========================================================
//  Bots Dialogs
//  To register a new dialog, use the following code: 
//
//  bot.dialog('dialogId', [function(session){},]);
//
//=========================================================

// Register the root dialog
bot.dialog(DIALOG_ROOT, function (session) {
    var messageCard = createUrlCard(session, CARD_TITLE, CARD_TEXT, URL_LOGO_TDC, URL_LINK_TDC);

    var cardMessage = new builder.Message(session)
        .attachments([messageCard]);

    session.send(cardMessage);

    session.send("Hello! My name is TdcBot, and my mission is to show the power of bots to you! :)");

    session.beginDialog(DIALOG_MENU);
});

function createUrlCard(session, title, text, imageUrl, destinationUrl) {
    return new builder.HeroCard(session)
        .title(title)
        .text(text)
        .images([
            builder.CardImage.create(session, imageUrl)
        ])
        .tap(builder.CardAction.openUrl(session, destinationUrl))
}

// Creating the menu dialog
bot.dialog(DIALOG_MENU, [
    function (session) {
        builder.Prompts.choice(session, MENU_LABEL, MENU_OPTIONS);
    },
    function (session, results) {
        switch (results.response.index) {
            case MENU_ITEM_TRIVIA:
                session.beginDialog(DIALOG_TRIVIA);
                break;
            case MENU_ITEM_QUIT:
            default:
                session.endDialog();
                break;
        }
    }]
);

// Creating the trivia dialog
bot.dialog(DIALOG_TRIVIA, [
    function (session) {
        session.send("Let's grab a trivia for you!");

        request(URL_TRIVIA_API, function (error, response, data) {
            if (!error) {
                var dataJson = JSON.parse(data);
                var trivia = dataJson.results[0];

                session.send('Category:\t' + trivia.category);
                session.send('Difficulty:\t' + trivia.difficulty);
                session.send('Question:' + trivia.question);

                var answers = trivia.incorrect_answers;

                var correct_answer = trivia.correct_answer;

                var correct_answer_index = Math.floor(Math.random() * answers.length);

                session.dialogData.correct_answer = correct_answer;
                session.dialogData.correct_answer_index = correct_answer_index;

                answers.splice(correct_answer_index, 0, correct_answer);

                builder.Prompts.choice(session, "Choose the right answer:", answers);
            }
        });
    },
    function (session, results) {
        if (session.dialogData.correct_answer_index === results.response.index) {
            session.send('You chose the right answer! Congratulations!');
        } else {
            session.send('You chose the wrong answer. :(');
            session.send('The right answer was: ' + session.dialogData.correct_answer);
        }
        session.endDialog();
    },
]);




