# NFL-Score-Notification
This is a personal project where I wanted to use Go and APIs to practice my skills. The point of this project was to send notifications to my phone via text message when NFL games ended. I wanted to send texts of the final scores in every game window so usually 1:00 PM, 4:05 PM, 4:25 PM, 8:15 PM, etc. I was able to find a Google sheet created by [Ryan Buckner](https://www.reddit.com/user/ryanbuckner/) which has game data for every game of the 2024 season. I modified the existing spreadsheet to be better formatted and changed the Google Apps Script associated with the sheet. The changes I made include automatically setting up [triggers](https://developers.google.com/apps-script/guides/triggers/installable) to run functions. I created triggers to only run on game days and to delete triggers once the  last game of a game day was completed.

## Sheets
<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=2012782522#gid=2012782522" target="_blank" rel="noopener noreferrer"> Week Filter </a> </summary>
  
  <img src="https://github.com/user-attachments/assets/e5a03932-ea47-4907-bbc0-22fb0ec7342c" alt="Week Filter Sheet"/>
</details>

<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=1564337599#gid=1564337599" target="_blank" rel="noopener noreferrer"> Division Standings Sheet </a></summary>
  <img src="https://github.com/user-attachments/assets/f5e408bb-995b-4a39-af9e-68c0784c93ed" alt="Division Standings Sheet"/>
</details>

<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=1564337599#gid=1564337599" target="_blank" rel="noopener noreferrer"> AFC Standings Sheet</a></summary>
  <img src="https://github.com/user-attachments/assets/77d2d40f-0102-403d-a5cc-55de10745518" alt="AFC Standings Sheet"/>
</details>

<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=362441396#gid=362441396" target="_blank" rel="noopener noreferrer"> NFC Standings Sheet</a></summary>
  <img src="https://github.com/user-attachments/assets/7af5193a-a4a0-4837-90c3-602635bc6dcc" alt="NFC Standings Sheet"/>
</details>

<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=1227961915#gid=1227961915" target="_blank" rel="noopener noreferrer">Live Scoring</a></summary>
  <img src="https://github.com/user-attachments/assets/63ed3560-3dd1-4474-b205-919a7357bea5" alt="Live Scoring Sheet"/>
</details>

<details>
  <summary><a href="https://docs.google.com/spreadsheets/d/1YeKmJEr0zGP00ZhgRmVC4gaOet5D2f_UNsF17iOkPGI/edit?pli=1&gid=707813147#gid=707813147" target="_blank" rel="noopener noreferrer">O/U Analysis Sheet</a></summary>
  <img src="https://github.com/user-attachments/assets/6eb02ceb-bf82-4f1b-9831-f73b29e9c87b" alt="O/U Analysis Sheet"/>
</details>
