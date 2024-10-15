/////////////////////////////////////////////////////////////////////////////////////////////
// Author: Ryan Buckner
// Date:   02/2023
// Updated: 08/08/2024 by ryanbuckner
// Usage:  Free and Open
/////////////////////////////////////////////////////////////////////////////////////////////

// using sets the timezone equal to the timezone in the sheet settings
var TIMEZONE = Session.getScriptTimeZone();
var oddsDict = getOddsDict();
var datesPlayed = []
// change this year to use for a new season 
const SEASON_YEAR = "2024";
const PRESEASON_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=1&dates=";
const REGSEASON_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&dates=";
const POSTSEASON_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=3&dates=";
const STATISTICS_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=";
// API error trapping
options = { muteHttpExceptions: true };

// the main function drives the show - if you need a button tie it to this 
function main() {
  sheetData = allgames();
  writeToSheet(sheetData);
}

// pull the odds so they are preserved
function readOldOdds() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Live Scoring");
  var range = sheet.getRange(2, 17, sheet.getLastRow() - 1, 3);
  var values = range.getValues();

  return values;
}

function getOddsDict() {
  var games = readOldOdds();
  var gamesDict = {};

  games.forEach(function (value) {
    gamesDict[value[0]] = [value[1], value[2]];
  });

  return gamesDict;
}

function getTotalYardsByTeamId(jsonData, teamId) {

  const teams = jsonData.boxscore.teams;
  for (let i = 0; i < teams.length; i++) {
    if (teams[i].team.id == teamId) {
      const statistics = teams[i].statistics;
      for (let j = 0; j < statistics.length; j++) {
        if (statistics[j].name === "totalYards") {
          return statistics[j].displayValue;
        }
      }
    }
  }
  return null; // return null if the teamId or totalYards is not found
}

// use this to write the info to the sheet 
function writeToSheet(data) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Live Scoring");
  sheet.clear();
  sheet.getRange(1, 1, data.length, data[0].length).setValues(data);

  // write an update timestamp so the user knows how recent the data is
  var now = new Date();
  var timestamp = Utilities.formatDate(now, TIMEZONE, "E hh:mm a");
  sheet.getRange('A1').setValue(timestamp);

  // Sort the Live Scoring sheet by date so it's easier to read
  let range = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn());
  range.sort({ column: 2, ascending: true });

}

// Preseason games have a different naming convention
function getPreWeekName(weeknum) {
  var weekName;
  if (weeknum == -4) {
    weekName = "Pre Week 3";
  } else if (weeknum == -3) {
    weekName = "Pre Week 2";
  } else if (weeknum == -2) {
    weekName = "Pre Week 1";
  } else if (weeknum == -1) {
    weekName = "HOF Game";
  }
  return weekName;
}

// Postseason games have a different naming convention
function getPostWeekName(weeknum) {
  var weekName;
  if (weeknum == 19) {
    weekName = "WildCard";
  } else if (weeknum == 20) {
    weekName = "Divisional";
  } else if (weeknum == 21) {
    weekName = "Conference";
  } else if (weeknum == 22) {
    weekName = "Pro Bowl";
  } else if (weeknum == 23) {
    weekName = "SuperBowl";
  }
  return weekName;
}

function isWithinMinutesOfGameStart(gameStartTime, minutes) {
  // Parse the provided gameStartTime using JavaScript's Date object
  var gameStart = new Date(gameStartTime);

  // Calculate the time difference between the game start time and the current time
  var timeDifference = gameStart - new Date();

  // Check if the time difference is positive (game has not started) and less than or equal to the specified minutes
  return timeDifference > 0 && timeDifference <= minutes * 60 * 1000; // Convert minutes to milliseconds
}

// Adjust the team score for the spread 
// The underdog get the spread points added to their total 
function getAdjustedScore(favoredTeam, spread, teamAbbr, teamScore) {
  var adjustedScore;
  // if there is no spread yet, or if the game is even, or if checking for the favored team, no adjustment needed
  if (favoredTeam == "" || spread == "" || spread == 0 || favoredTeam == teamAbbr) {
    adjustedScore = teamScore * 1;
  } else {
    adjustedScore = teamScore * 1 - spread * 1;
  }
  return adjustedScore;
}

function createImage(url, altText, desc) {
  let tempImage = SpreadsheetApp
    .newCellImage()
    .setSourceUrl(url)
    .setAltTextTitle(altText)
    .setAltTextDescription(desc)
    .build();

  return tempImage;
}

// get all games for the year and return a data set 
function allgames() {
  result = [];
  result.push([weekName, "Date", "Time", "Away Team", "Away", "Home Team", "Home", "Away Score", "Home Score", "Qtr", "Clock", "Situation", "Pos", "Status", "Score", "Total Points", "Game Id", "O/U", "Odds", "Favored Team", "Spread", "Fav Covered", "Box Score Home", "Box Score Away", "Home Display Name", "Away Display Name", "Game Winner", "Game Loser", "Over", "Under", "Broadcast", "Home Off Yds", "Away Off Yds"]);

  // using negative numbers for the preseason
  for (var week = -4; week < 24; week++) {
    var weeknum = week;

    // there is no game for week 0
    if (week == 0) {
      continue;
    }

    // preseason games
    if (weeknum < 0) {
      var url = PRESEASON_BASE_URL + SEASON_YEAR + "&week=" + Math.abs(weeknum);
      weekName = getPreWeekName(weeknum);
    }

    // regular season games 1-18
    if (weeknum >= 1 && weeknum <= 18) {
      var url = REGSEASON_BASE_URL + SEASON_YEAR + "&week=" + weeknum;
      var weekName = "Week " + weeknum;
    }

    // post season games
    if (weeknum > 18) {
      var url = POSTSEASON_BASE_URL + SEASON_YEAR + "&week=" + (weeknum - 18)
      weekName = getPostWeekName(weeknum);
    }

    // Hit the API, get the data 
    var json = UrlFetchApp.fetch(url, options).getContentText();
    var data = JSON.parse(json);

    var games = data['events'];
    if (games === null) {
      result.push([]);
      continue;
    }

    // cycle through all the games in the week 
    for (var i = 0; i < games.length; i++) {
      // create a dict (game) with each game as a shortcut 
      var game = games[i]['competitions'][0];
      var gameId = games[i]['id'];

      // get the team names, logos, abbrv, and  scores for the game
      var home = game['competitors'][0]['team']['name'];
      var homeScore = game['competitors'][0]['score'];
      var away = game['competitors'][1]['team']['name'];
      var awayScore = game['competitors'][1]['score'];
      var homeabbr = game['competitors'][0]['team']['abbreviation'];
      var awayabbr = game['competitors'][1]['team']['abbreviation'];
      var homeId = game['competitors'][0]['team']['id'];
      var awayId = game['competitors'][1]['team']['id'];
      var homeDisplayName = game['competitors'][0]['team']['displayName'];
      var awayDisplayName = game['competitors'][1]['team']['displayName'];
      var awayLogo = game['competitors'][1]['team']['logo'];
      var homeLogo = game['competitors'][0]['team']['logo'];

      // get game time information for the game
      var gameTime = new Date(game['date']);
      var time = Utilities.formatDate(gameTime, TIMEZONE, "hh:mm a");
      var date = gameTime
      datesPlayed.push(date)
      date.toLocaleString('en-US', { timeZone: TIMEZONE, year: 'numeric', month: 'numeric', day: 'numeric' });
      var freezeOdds = false;

      if (game['broadcasts'] && game['broadcasts'][0] && game['broadcasts'][0]['names']) {
        var homeBroadcast = game['broadcasts'][0]['names'];
        var awayBroadcast = game['broadcasts'][0]['names'];
      }
      else {
        var homeBroadcast = "";
        var awayBroadcast = "";
      }


      // get current quarter and time remaining in the game
      var period = game['status']['period'];
      var displayClock = game['status']['displayClock'];
      var gameStatus = game['status']['type']['state'];
      // The ESPN API leaves the quarter as 4 even when the game is over. I prefer "F"
      if (gameStatus == "post") {
        period = 'F';
      } else if (gameStatus == "pre") {
        period = 'pre';
      }

      // If the game is in progress, try to get the current down and team with possession
      // ESPN sends an ID for the team with possession, so match it with the right team
      var possessionLogo = "";
      var possessionTeam = "";

      if (gameStatus == "in") {
        try {
          var situation = game['situation']['downDistanceText'];
          var possessionId = game['situation']['possession'];
          //var lastPlay = game['situation']['lastPlay']['text'];
          var lastPlay = "";
          if (+possessionId == +homeId) {
            var possessionTeam = homeabbr;
            var possessionTeamDesc = home;
          }
          else if (+possessionId == +awayId) {
            var possessionTeam = awayabbr;
            var possessionTeamDesc = away;
          }
        }
        catch (err) { // sometimes the field is not there, so treat as if there is no current progress 
          var situation = "waiting...";
          var possessionTeam = "";
          var lastPlay = "";
        }
      } else { // if the game in not in progress there is no current progress 
        var situation = "waiting...";
        var possessionTeam = "";
        var lastPlay = "";
      }

      var gameWinner = "";
      var gameLoser = "";
      if (gameStatus == "post") {
        if (game['competitors'][0]['winner'] == true) {
          gameWinner = home;
          gameLoser = away;
        } else if (game['competitors'][1]['winner'] == true) {
          gameWinner = away;
          gameLoser = home;
        } else {
          gameWinner = "TIE";
          gameLoser = "TIE";
        }
      }

      // see if there are odds and spreads 
      try {
        var overUnder = game['odds'][0]['overUnder']
        var odds = game['odds'][0]['details']
        if (odds == 'EVEN') {
          var favoredTeam = "";
          var spread = 0;
        } else {
          var favoredTeam = odds.split(" ")[0];
          var spread = odds.split(" ")[1] * 1;
        }
      } catch (err) {
        var overUnder = ""
        var odds = ""
        var favoredTeam = "";
        var spread = "";
      }

      if (!overUnder) {
        overUnder = "";
      }
      if (!odds) {
        odds = "";
      }

      // Get the minutes value from cell F1 in the "Pick Values" sheet
      var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Pick Values");
      var minutesRange = sheet.getRange("F1"); // 
      var minutes = minutesRange.getValue();

      // if the user elected to free the odds before the game, get the number of minutes to  
      if (minutes > 0) {
        if (gameStatus == "pre") {
          if (isWithinMinutesOfGameStart(gameTime, minutes)) {
            var freezeOdds = true;
          } else {
            var freezeOdds = false;
          }
        } else {
          freezeOdds = false;
        }
      }

      try {
        var oldOverUnder = oddsDict[gameId][0];
        if (overUnder == "") {
          overUnder = oldOverUnder;
        }
      } catch {
        overUnder = "";
      }

      try {
        var oldOdds = oddsDict[gameId][1];
        if (odds == "") {
          odds = oldOdds;
          if (odds != "") {
            spread = odds.split(" ")[1] * 1;
            favoredTeam = odds.split(" ")[0];
          }
        }
      } catch {
        overUnder = "";
        spread = "";
        favoredTeam = "";
      }

      if (favoredTeam == "EVEN") {
        spread = 0;
      }

      var boxHome = [];
      var boxAway = [];
      if (game['competitors'][0]['linescores']) {
        for (g = 0; g < game['competitors'][0]['linescores'].length; g++) {
          boxHome.push(game['competitors'][0]['linescores'][g]['value']);
        }
        boxHome = boxHome.join();
      }
      if (game['competitors'][1]['linescores']) {
        for (f = 0; f < game['competitors'][1]['linescores'].length; f++) {
          boxAway.push(game['competitors'][1]['linescores'][f]['value']);
        }
        boxAway = boxAway.join();
      }

      // get the adjusted score for the spread 
      var awayScoreAdjusted = getAdjustedScore(favoredTeam, spread, awayabbr, awayScore);
      var homeScoreAdjusted = getAdjustedScore(favoredTeam, spread, homeabbr, homeScore);
      var favoredTeamCover = "";

      if (gameStatus == "post" && favoredTeam != "") {
        if (favoredTeam == "EVEN" && awayScoreAdjusted != homeScoreAdjusted) {
          favoredTeamCover = "Covered";
        }
        else if (awayScoreAdjusted > homeScoreAdjusted && awayabbr == favoredTeam) {
          favoredTeamCover = "Covered";
        }
        else if (homeScoreAdjusted > awayScoreAdjusted && homeabbr == favoredTeam) {
          favoredTeamCover = "Covered";
        }
        else if (awayScoreAdjusted == homeScoreAdjusted) {
          favoredTeamCover = "Tied";
        }
        else {
          favoredTeamCover = "Not Covered";
        }
      }
      // total up the points for over under bets for the game. Multiply *1 to force the datatype 
      var totalPoints = (awayScore * 1) + (homeScore * 1)
      var finalScore = awayabbr + " " + awayScore + " " + homeabbr + " " + homeScore + " (" + period + ")";

      // Show the adjusted score with spread during the game and after the game. Non-favored team gets the spread points
      if (gameStatus in ["in", "post",]) {
        var finalAdjustedScore = awayabbr + " " + awayScoreAdjusted + " " + homeabbr + " " + homeScoreAdjusted + " (" + period + ")";
      } else {
        var finalAdjustedScore = "";
      }

      var gameFinalOver = 0;
      var gameFinalUnder = 0;
      if (gameStatus == "post") {
        situation = "game over";
        if (totalPoints > overUnder) {
          gameFinalOver = 1;
        }
        if (totalPoints < overUnder) {
          gameFinalUnder = 1;
        }
      }



      // reach out to the stats endpoint and get total yards
      var homeTotalYards = "";
      var awayTotalYards = "";
      if (gameStatus == "post") {
        var url = STATISTICS_BASE_URL + gameId;
        // Hit the API, get the data 
        var json = UrlFetchApp.fetch(url, options).getContentText();
        var data = JSON.parse(json);

        var homeTotalYards = getTotalYardsByTeamId(data, homeId);
        var awayTotalYards = getTotalYardsByTeamId(data, awayId);
      }

      var broadcasts = homeBroadcast;

      // push the game data to the result object 
      result.push([
        weekName,
        date,
        time,
        away,
        awayabbr,
        home,
        homeabbr,
        awayScore,
        homeScore,
        period,
        displayClock,
        situation,
        possessionTeam,
        gameStatus,
        finalScore,
        totalPoints,
        gameId,
        overUnder,
        odds,
        favoredTeam,
        spread,
        favoredTeamCover,
        boxHome,
        boxAway,
        homeDisplayName,
        awayDisplayName,
        gameWinner,
        gameLoser,
        gameFinalOver,
        gameFinalUnder,
        broadcasts,
        homeTotalYards,
        awayTotalYards,
      ]);
    }
  }
  return result;
}

// Code below is created by Peter Skowronek https://github.com/1pete3
// Function that checks if there's a game today,  regular season - super bowl
// GameDay() returns an array where the first element is a boolean value true if there are games today, false otherwise
// The second element is the date of the game 
// The third element in the returned array is an array containing the different game windows 12:00 pm, 4:00 pm, etc.
function GameDay() {
  let gameDay = false
  let currentDate = new Date().toLocaleString('en-us', { year: 'numeric', month: 'numeric', day: 'numeric' })
  const gameTimes = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Live Scoring').getRange('A1:Q336').getValues()
  let test = new Date('10/13/2024').toLocaleString('en-us', { year: 'numeric', month: 'numeric', day: 'numeric' })
  let testTime = new Date('10/13/2024').toLocaleString('en-us', { hour: 'numeric', minute: 'numeric', hour12: 'true' })
  let week = ""
  let lastGameID = ""
  let arr = []
  //console.log(gameTimes)
  //console.log(test)

  for (i = 0; i < gameTimes.length; i++) {
    if (gameTimes[i][1].toLocaleString('en-us', { year: 'numeric', month: 'numeric', day: 'numeric' }) === currentDate) {
      gameDay = true
      if (arr.includes(gameTimes[i][1].toLocaleString('en-us', { hour: 'numeric', minute: 'numeric', hour12: true }))) {

      }
      else {
        arr.push(gameTimes[i][1].toLocaleString('en-us', { hour: 'numeric', minute: 'numeric', hour12: true }))
        week = gameTimes[i][0]
        lastGameID = gameTimes[i][16]
      }
    }
  }


  console.log([gameDay, currentDate, arr, week, lastGameID])
  return ([gameDay, currentDate, arr, week, lastGameID])
}

function stopMainTrigger() {
  last_game_ID = GameDay()[4]
  stopMainTriggerID = ""
  console.log(last_game_ID)
  let deleteTriggerIndex = []
  const allTriggers = ScriptApp.getProjectTriggers()
  for (j = 0; j < allTriggers.length; j++) {
    //&& allTriggers[j].getHandlerFunction() !=='stopMainTrigger'
    if (allTriggers[j].getHandlerFunction() !== 'createTriggersForGameDays') {
      deleteTriggerIndex.push(j)
    }
    if (allTriggers[j].getHandlerFunction() !== 'stopMainTrigger') {
      stopMainTriggerID = allTriggers[j].getUniqueId()
    }
  }
  let liveScoreInfo = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Live Scoring').getRange('A1:Q336').getValues()
  for (i = 0; i < liveScoreInfo.length; i++) {
    if (liveScoreInfo[i][16] === last_game_ID && liveScoreInfo[i][13] === "post") {
      for (k = 0; k < deleteTriggerIndex.length; k++) {
        console.log("Deleted " + allTriggers[deleteTriggerIndex[k]].getHandlerFunction())
        ScriptApp.deleteTrigger(allTriggers[deleteTriggerIndex[k]])

      }
      main()
    }
    else{
      gameStillOn = true
      break
    }
  }
  if (gameStillOn === true){
    console.log("Game is still going on ")
  }
}

// Creates a trigger to run at the start of the first game start time and calls the createTrigger() function to create a trigger to run main() every
// 5 minutes to update the scores on the spread sheet
function createTriggersForGameDays() {
  if (GameDay()[0] === false) {
    return
  }
  else {
    let date = GameDay()[1]
    let time = GameDay()[2][0]
    last_game = GameDay()[2][GameDay()[2].length - 1]
    lastGameID = GameDay()[2][4]
    console.log(lastGameID)
    triggerDate = new Date(date + " " + time)
    lastGameTriggerHour = Number(last_game.slice(0, last_game.indexOf(':'))) + 2
    lastGameTriggerStart = lastGameTriggerHour + last_game.slice(last_game.indexOf(":"))
    console.log(lastGameTriggerStart)

    deleteTriggerTime = new Date(date + " " + lastGameTriggerStart)
    let mainFunc = false
    const allTriggers = ScriptApp.getProjectTriggers();
    for (i = 0; i < allTriggers.length; i++) {
      //console.log(allTriggers[i].getHandlerFunction())
      if (allTriggers[i].getHandlerFunction() === 'main') {
        mainFunc = true
        console.log("Trigger for main() exists")
        break
      }
    }
    if (mainFunc !== true) {
      console.log("Creating trigger for createTrigger()")
      ScriptApp.newTrigger('createTrigger')
        .timeBased()
        .at(triggerDate)
        .create();
    }
    ScriptApp.newTrigger('createStopTriggers')
      .timeBased()
      .at(deleteTriggerTime)
      .create();

  }



}

function createTrigger() {
  let mainFunc = false
  const allTriggers = ScriptApp.getProjectTriggers();
  for (i = 0; i < allTriggers.length; i++) {
    //console.log(allTriggers[i].getHandlerFunction())
    if (allTriggers[i].getHandlerFunction() === 'main') {
      mainFunc = true
      console.log("Trigger for main() exists")
      break
    }
  }
  if (mainFunc !== true) {
    ScriptApp.newTrigger('main')
      .timeBased()
      .everyMinutes(5)
      .create();
    console.log("Created a new trigger for main()")
  }
}

function createStopTriggers() {
  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .create();

  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.WEDNESDAY)
    .create();

  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.THURSDAY)
    .create();

  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.FRIDAY)
    .create();

  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.SATURDAY)
    .create();

  ScriptApp.newTrigger('createTriggersForGameDays')
    .timeBased()
    .atHour(8)
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .create();

}