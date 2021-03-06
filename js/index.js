const BrowserWindow = require('electron').remote; // we use remote to access the browser window
//const navigation = require('./navigation_menu')
// index renderer for countdown example with ipc event from main
const ipc = require('electron').ipcRenderer;

// constants
const CLIENT_ID = 'jp0gvzo6nccw4x9scrpsj44t5xti9o';
const CLIENT_SECRET = 'vayh1u36k8j1q4jc407xl8d2jf0qz1';
const MAX_LIMIT = 100;

// document ready
$(document).ready(function() {
    $('#menu-switch-btn').on('click', function() {
        navigation($('#side-bar'), $('#container'));
    });
    $('#title-bar-min-btn').on('click', function() {
        minimizeScreen();
    });
    $('#title-bar-screen-btn').on('click', function() {
        changeFullscreen();
    });
    $('#title-bar-close-btn').on('click', function() {
        quitApplication();
    });
    $('#login-btn').on('click', function() {
        sendLoginMessage();
    });
    $('#logout-btn').on('click', function() {
        logout();
    })

    // temp load top streamers
    $.ajax({
        url: 'https://api.twitch.tv/helix/streams',
        method: 'GET',
        headers: {
            'Client-ID': CLIENT_ID,
        },
        data: {
            'first': MAX_LIMIT
        }
    }).done(function(stream_result){
        var liveUserIDs = [];
        stream_result.data.forEach(x => { 
            if (x.type == 'live') { 
                liveUserIDs.push(x.user_id);
            }
        });
        $.ajax({
            url: 'https://api.twitch.tv/helix/users',
            method: 'GET',
            headers: {
                'Client-ID': CLIENT_ID
            },
            data: {
                'id': liveUserIDs
            }
        }).done(function(users_result){
            for (var i = 0; i < users_result.data.length; i++) {
                // create element
                appendStream(users_result.data[i].login);
            }
        }).fail(function(error){
            console.log('AJAX Error: ' + error.responseText);
        });
    }).fail(function(error){
        console.log('AJAX Error: ' + error.responseText);
    });
});

function minimizeScreen () {
    let window = BrowserWindow.getCurrentWindow();
    window.minimize();
}

function changeFullscreen () {
    let window = BrowserWindow.getCurrentWindow();
    window.setFullScreen(!window.isFullScreen());
}

function quitApplication () {
    ipc.send('quit-application');
}

function logout() {
    let window = BrowserWindow.getCurrentWindow();
    window.reload();
}

// https://www.w3schools.com/howto/howto_js_sidenav.asp
/* Set the width of the side navigation to 250px and the left margin of the page content to 250px and add a black background color to body */
function openNav(side_bar, container) {
    $(side_bar).css('width', '250px').attr('data-navigation', 'true');
    $(container).css('margin-left', '250px');
}

/* Set the width of the side navigation to 0 and the left margin of the page content to 0, and the background color of body to white */
function closeNav(side_bar, container) {
    $(side_bar).css('width', '0').attr('data-navigation', 'false');
    $(container).css('margin-left', '0');
}

function navigation(side_bar, container) {
    var navigation = $(side_bar).attr('data-navigation');
    if (navigation == 'false') {
        openNav(side_bar, container);
    } else {
        closeNav(side_bar, container);
    }
}

// create a embedded twitch player at the twitch embed location
function createEmbeddedPlayer (channel) {
    playerLoadingCSS();

    var embed = new Twitch.Embed("twitch-embed", {
        width: '100%',
        height: '100%',
        channel: channel,
        allowfullscreen: true,
        chat: 'default',
        theme: 'dark'
    });

    embed.addEventListener(Twitch.Embed.VIDEO_READY, () => {
        playerDoneLoadingCSS();
        var player = embed.getPlayer();
        player.play();
    });
}

function playerLoadingCSS() {
    $('#twitch-logo').addClass('hidden');
    //$('#twitch-loading').width($('#container').width() - $('#side-bar').width()); // resize due to fixed position
    $('#twitch-loading').removeClass('hidden');
}

function playerDoneLoadingCSS() {
    $('#twitch-loading').addClass('hidden');
}

function appendStream (streamer_name) {
    $('#follow-list').append('<a class="channel" data-channel="' + streamer_name + '">' + streamer_name + '</a>');
    $('.channel[data-channel="' + streamer_name + '"]').on("click", { channel: streamer_name }, changeStream);
}

function clearFollowList () {
    $('#follow-list a').remove();
}

function changeStream (channel) {
    // remove old embedded player and create a new one
    navigation($('#side-bar'), $('#container'));
    $('#twitch-embed iframe').remove();
    createEmbeddedPlayer(channel.data.channel);
}

function sendLoginMessage () {
    ipc.send('user-login');
}

ipc.on('user-login-completed', function (event, data) {
    // here we'll accept the authentication token and attempt to sign in and pull user information
    var access_token = data.access_token;
    if (access_token != null) {
        // first clear the follow list
        clearFollowList();
        // attempt to get follow list of person logged in
        $.ajax({
            url: 'https://api.twitch.tv/helix/users',
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + access_token,
                'Client-ID': CLIENT_ID
            }
        }).done(function(result){
            // Load in the users data
            user_id = result.data[0].id;
            username = result.data[0].login;

            // if everything loads in we'll hide the login button, potentially replace it with something else
            userLoggedIn(username);

            // get followers 
            if (user_id != null) {
                $.ajax({
                    url: 'https://api.twitch.tv/helix/users/follows',
                    method: 'GET',
                    headers: {
                        'Authorization': 'Bearer ' + access_token,
                        'Client-ID': CLIENT_ID
                    },
                    data: {
                        'from_id': user_id,
                        'first': MAX_LIMIT
                    }
                }).done(function(result){
                    // these are all of the follows that the user has
                    var user_ids = [];
                    result.data.forEach(x => { 
                        user_ids.push(x.to_id);
                    });
                    $.ajax({
                        url: 'https://api.twitch.tv/helix/streams',
                        method: 'GET',
                        headers: {
                            'Client-ID': CLIENT_ID,
                            'Authorization': 'Bearer ' + access_token
                        },
                        data: {
                            'first': MAX_LIMIT,
                            'user_id': user_ids
                        }
                    }).done(function(streams_result){
                        // these are the live streams for the user, but we have to get their logins for the names
                        var user_ids = [];
                        streams_result.data.forEach(x => { 
                            user_ids.push(x.user_id);
                        });
                        $.ajax({
                            url: 'https://api.twitch.tv/helix/users',
                            method: 'GET',
                            headers: {
                                'Client-ID': CLIENT_ID
                            },
                            data: {
                                'id': user_ids
                            }
                        }).done(function(users_result){
                            // append streams that we succesfully get the information for
                            for (var i = 0; i < users_result.data.length; i++) {
                                // create element
                                appendStream(users_result.data[i].login);
                            }
                        }).fail(function(error){
                            console.log('AJAX Error: ' + error.responseText);
                        });
                    }).fail(function(error){
                        console.log('AJAX Error: ' + error.responseText);
                    });
                }).fail(function(error){
                    console.log('AJAX Error: ' + error.responseText);
                });
            }

        }).fail(function(error){
            console.log('AJAX Error: ' + error.responseText);
        });
    }
});

function userLoggedIn(username) {
    // hide the login button
    $('#login-btn').addClass('hidden');

    // load in profile info and unhide
    $('#profile-name').text(username);
    $('#profile').removeClass('hidden');
}