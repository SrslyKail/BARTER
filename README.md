# Welcome to **BARTER**

**BARTER** is a marketplace app to help people exchange skills and services without the use of currency.

## Tech

### Front End:

- Bootstrap
- JavaScript
- CSS

### Middleware:

- Multer
- JavaScript
- JOI
- Express

### Back-end:

- Node
- NodeMailer
- JavaScript
- GoogleMaps
- MongoDB
- Cloudinary

### Tools:

- VSCode
- Git

## Files

<details>
<summary>Click here to see the file tree</summary>

```
Root
│   .gitattributes
│   .gitignore
│   2800_202410_BBY14.code-workspace
│   index.js
│   package-lock.json
│   package.json
│   README.md
│   skillCatSchema.json
│   skillsSchema.json
│   template.env
│   userSchema.json
│   utils.js
│
├───public
│   ├───audio
│   │       Zamn.mp3
│   │       Zamn.wav
│   │
│   ├───imgs
│   │       bigzamn.svg
│   │       logo.png
│   │       logo.svg
│   │       profileIconLoggedOut.png
│   │
│   ├───scripts
│   │       profile.js
│   │
│   └───styles
│       │   favicon.ico
│       │   rounded-icon.svg
│       │   style.css
│       │
│       └───fonts
│               basquiat.otf
│               basquiat.ttf
│               basquiat.woff
│               basquiat.woff2
│
├───scripts
│   │   imgUpload.js
│   │
│   └───modules
│           databaseConnection.js
│           gmaps.js
│           localSession.js
│           location.js
│           logging.js
│           mailer.js
│
└───views
    │   404.ejs
    │   addPortfolio.ejs
    │   category.ejs
    │   editPortfolio.ejs
    │   editProfile.ejs
    │   history.ejs
    │   index.ejs
    │   legal.ejs
    │   login.ejs
    │   loginInvalid.ejs
    │   passwordChange.ejs
    │   passwordReset.ejs
    │   portfolio.ejs
    │   profile.ejs
    │   settings.ejs
    │   signup.ejs
    │   skill.ejs
    │
    └───templates
        │   card-icon-generation.ejs
        │   footer.ejs
        │   header.ejs
        │   portfolio-icon-generation.ejs
        │   profileCard.ejs
        │   searchHero.ejs
        │   skill-pill-generation.ejs
        │   svgs.ejs
        │
        └───components
                addSkillButton.ejs
                backButton.ejs
                button.ejs
                card-image-icon.ejs
                cardStars.ejs
                editButton.ejs
                footerButton.ejs
                logo.ejs
                passwordInput.ejs
                portfolio-image-icon.ejs
                portfolioCard.ejs
                profileIcon.ejs
                searchbar.ejs
                skill-pill-box.ejs
```

</details>
<details open>
<summary>Folder and file explanations</summary>

<details>
<summary> <b>Root</b> </summary>

- The root of the project needs to contain files that are immediately used by git, the node, and the server.

1.  .gitattributes

    - Helps track the lines submitted by ignoring the line count of specific large non-code based file types and specifying what language to count certain filetypes as.

1.  .gitignore

    - Ensures you don't upload specific file types into Github, such as your `.env` file.

1.  2800_202410_BBY14.code-workspace

    - A `.code-workspace` file standardizes the plugins and formatting for all team members using VS Code.

1.  index.js

    - The root server file. Should be run with node.

1.  package-lock.json

1.  package.json

    - Package and package-lock are used to allow you to quickly get the require node modules by running `npm -i` in the root.

1.  README.md

    - This file!

1.  skillCatSchema.json

    - The Schema describing how BARTER handles information being laid out for the Skill Categories

1.  skillsSchema.json

    - The Schema describing how BARTER handles information being laid out for the User Skills.

1.  template.env

    - A template .env file to help you quickly get set up.

1.  userSchema.json

    - A JSON file that represents the schema used for our MongoDB. Please reference it when attempting to interact with MongoDB.

1.  utils.js

    - Some useful functions that we want active globally. Primarily used to turn local paths into absolute paths to allow the imports of local modules to run more reliably on all OS's.

</details>

<details>
<summary> <b>Public</b> </summary>

- Files in the Public folder are all those that will be accessed by the Client during the use of BARTER.

  <details>
    <summary> <b>Audio</b> </summary>

  1. `Zamn.mp3`
  1. `Zamn.wav`

     - Currently just used for an easter egg within the site.

  </details>

  <details>
  <summary> <b>Imgs</b> </summary>

  1. bigzamn.svg

     - Used as a default background for the user card area on profiles.

  1. logo.png
  1. logo.svg

     - The logo for BARTER. Currently the png isn't used, but we decided to leave just in case a situation where we need it in the future arises.

  1. profileIconLoggedOut.png

     - The default image that is displayed in place of the users profile image when they are logged out, or if they dont have one attached to their account.

  </details>

  <details>
  <summary> <b>Scripts</b> </summary>

  1. profile.js

     - A collection of functions related to handling the Portfolio section of the user profile.

  </details>

  <details>
  <summary> <b>Styles</b> </summary>

  1. favicon.ico

     - The favicon used when the user favorites the page, and that appears in the tab header for the browser.

  1. rounded-icon.svg

     - An SVG we used to mask images and make them appear round.

  1. style.css

     - The stylesheet and fonts we use to make BARTER look as amazing as it does!

    <details>
    <summary> <b>Fonts</b> </summary>

      1. basquiat.otf

      1. basquiat.ttf

      1. basquiat.woff

      1. basquiat.woff2

          - The base font used in BARTER. We have various files to ensure we support different browsers and OS's

     </details>

  </details>

</details>

<details>
<summary> <b>Scripts</b> </summary>

- Meant to store scripts and libraries for server-side functionality. JS files in this folder can reference files within the Modules folder, but should not reference each other.

1.  imgUpload.js

    - Despite the name(Which we need to update), this handles processing input from user forms to update the users information on MongoDB.

     <details>
     <summary> <b>Modules</b> </summary>

    - Modules are small chunks of code that are related to one specific task. They shouldn't reference each other (Though some currently do; we need to fix that).

    1. databaseConnection.js


         - Handles establishing connection to new Collections and setting up the MongoDB node modules.

    1. gmaps.js


         - Currently unused. Meant to push a map with live locations to the user so they can see how far they are from another user using a google map.

    1. localSession.js


         - Controls the local session and stores information about the current user via a user class. Contains logic for querying the session for that information as well.

    1. location.js

       - Converts a users location to a place name, and handles the GoogleAPI connection. Contains a function you can uncomment if you want to test your google API key is working.

    1. logging.js


         - Useful for quickly turning logging on and off for debug purposes. By setting the variables within it, you can set what kinds of output you get quickly. Especially useful for monitoring events.

    1. mailer.js
       - Handles sending emails using the Node-Mailer module. Can be easily expanded if we want to send different types of emails.

     </details>

</details>

<details>
<summary> <b>Views</b> </summary>

- The parent folder for all the pages we can route the user to, and all the ejs components we made to build those pages.

1.  404.ejs

    - The page we redirect the user to if they attempt to navigate to a page that doesnt exist.

1.  addPortfolio.ejs

    - A page used for adding a new portfolio to the users profile.

1.  category.ejs

    - Displays all the skills within the given categories for the user to search through.

1.  editPortfolio.ejs

    - The page the user navigates to when they are editing their portfolio.

1.  editProfile.ejs

    - The page the user navigates to when they are editing their profile.

1.  history.ejs

    - Allows the user to see the profiles they've recently visited and the profiles they've recently contacted.

1.  index.ejs

    - The root page of the entire site.

1.  legal.ejs

    - Legal information related to the site and BBY14

1.  login.ejs

    - Used to allow the user to input their email/password and login

1.  loginInvalid.ejs

    - Redirect page for when the user enters an invalid login.

1.  passwordChange.ejs

    - Page to handle when the user is changing their password.

1.  passwordReset.ejs

    - Used to allow the user to start the password reset process. Will send them a temporary link they can use to access passwordChange.

1.  portfolio.ejs

    - Displays the portfolio of a given user and skill combination.

1.  profile.ejs

    - Displays the profile of the given user. Defaults to the current user is no argument is given, or reroutes to index is no argument is given **and** the user is not logged in.

1.  settings.ejs

    - Allows the user to customize their experience on BARTER. Or it would, if the site wasn't perfect. (We intend to support this later, and the page is a placeholder for now.)

1.  signup.ejs

    - Allows new users to sign up by entering their username, email, and a password they would like to use.

1.  skill.ejs

    - Shows all the users that have the given skill.

    <details>
    <summary> <b>Templates</b> </summary>

    - The templates folder contains core, well, templates that we use over-and-over within Barter. Each template is made of a series of components, and should not need to import other templates.

    1. card-icon-generation.ejs

       - Creates the skill & category cards used in the index and category pages. Allows us to pass in a single array and dynamically generate all the cards with minimal coding.

    1. footer.ejs

       - The foorter for BARTER; mostly invisible, but can have a button passed to it in order to create a static button of your choosing. Useful for things such as "contact" or "submit" buttons you want to be readily available.

    1. header.ejs

       - Contains the logo, user icon, options modal, and global imports we need.

    1. portfolio-icon-generation.ejs

       - Much like card-icon-generation; allows us to populate the users portfolio with an array with minimal code.

    1. profileCard.ejs

       - A card used to display the users profile icon, top skills, distance and location, and rating to other users. Think of it as a business card we display all over the site to quickly let users get an idea of who they're looking at.

    1. searchHero.ejs

       - A hero we include in many pages; used to integrate a (currently not functioning) search bar and keep its position and style consistent across pages.

    1. skill-pill-generation.ejs

       - Much like card-icon-generation; allows us to populate the users portfolio with an array with minimal code.

    1. svgs.ejs

       - contains generic SVGs we use in most pages for quick reference.

       <details>
       <summary> <b>Components</b> </summary>

       - This folder contains all the smaller components that our pages and templates are directly made up of. Each component shouldn't need to import other components to work.

       1. addSkillButton.ejs

          - A generic buttons used to add (and remove) skills from a user. Needs to be renamed and have its references updated accordingly to reflect its new functionality.

       1. backButton.ejs

          - The button used to navigate to the previous page.

       1. button.ejs

          - A generic button that served as an example of how to make and use components. Currently unused, but still lives as an example.

       1. card-image-icon.ejs

          - A standard component used to style the images used in user cards, skill icons, and category icons. An excellent example of how effective components can be when widely adopted. Editing this will update a LOT of the style across the site, so be wary when changing it.

       1. cardStars.ejs

          - Stars used to display a users average rating.

       1. editButton.ejs

          - Generic edit button; used where we need to allow the user to edit fields.

       1. footerButton.ejs

          - Used to populate a button within the footer. Created mostly by the arguments passed to the footer template, if the page requires a footer.

       1. logo.ejs

          - The logo component used in the header; may be used in other places in the future, so we thought it was useful to have it as its own component.

       1. passwordInput.ejs

          - Used anywhere you enter a password. Allows you to toggle text visibility.

       1. portfolio-image-icon.ejs

          - Similar to card-image-icon, but for portfolio images.

       1. portfolioCard.ejs

          - Made with the intent we would have different media types for portfolios. Currently unused.

       1. profileIcon.ejs

          - The profile icon that resides in the header.

       1. searchbar.ejs

          - A generic searchbar. Would ideally contain the code and logic needed to run the search bar. Currently not functioning, but used within the searchHero as a placeholder.

       1. skill-pill-box.ejs

          - Displayed on the users profile as a way to show what skills they have portfolios for, and link to them.

      </details>

   </details>

</details>

## Setup

Unfortunately, much of BARTER relies on our specific MongoDB setup, and for you to access it will require you to reach out to us and have us give you access, which is a pretty hard sell.

I'll do my best to guide you through a reasonable setup below, but beware bugs.

1. Pull this repo to your PC
1. Create a copy of `template.env` and rename it to `.env`
1. For MongoDB:
   - Create a MongoDB account,
   - Set up a database, and
   - Get the connection string.
1. Write the connection string within your `.env` file. You'll need to break it into its component pieces in order to fill out the MongoDB Host, User, Password, and Database portions of the `.env`.
1. Create a Google Developer account, and follow the [Google Maps Tutorial](https://developers.google.com/maps/get-started)
1. Once you've completed the setup, place the Google Maps API Key in the `.env`.
1. Set up a Cloudinary account and
   - set an image link according to each skill you want to have, mapping to the `skillsSchema.json`
   - set an image link according to each skill category you want to have, mapping to the `skillCatSchema.json`
   - Set your Cloudinary name, key, secret, and url in the `.env` file
1. Set the email address and password for the email account you want to use for nodeMailer in the `.env`
1. Set a UUID for the Node and MongoDB session secret in the `.env`
1. If you dont have it installed, download and install Node from [nodejs.org](https://nodejs.org/en/download/package-manager)
1. Open a command prompt window within the root of this project on your local PC
1. Run the command `npm -i` to install all the required node modules
1. Once the command is finished enter `node index.js` to launch Barter on your local machine.
1. Once its running, enter localhost:4000 in your browser of choice to access the index.

## How to use

From the index, you can select the skill category you need, then find the specific skill you want. From there you can see all the users with that skill(if you local instance has any), and can select a user to go to their profile and view their portfolios by selecting the relevant skill.

Once you've found someone you want to exchange with, select the Contact button from their profile to launch an email application on whatever device you're using and message the user. It's all up to you at that point!

If you want to profiles you've viewed before, you can select the user icon in the header, then select "history" and see the recent profiles you've viewed, and people you've contacted.

To leave a rating, go to any users profile and select the number of stars you want to rate them, then press "Submit"

To edit your profile, select the user icon in the header, then select "my profile".
Once on your profile, select the Edit icon, change the information you want to change, and press submit.

To add images to a portfolio, select the skill from your profile, then select the edit button. From there you can adjust the description and/or add a new image and save the changes.

To add/remove skills on your account, navigate to the skill page: The footer will allow you to add/remove the skill depending on if you have it or not.

## AI Contributions

None. Zero. Nadda. Nothing.

## About BBY-14 / BCMVP

The entire team worked on all aspects of the project. We feel we all contributed equally to front- and back-end, design, and project management. If we had to select a role, "Full-stack Developer" seems to be the most appropriate.

If you need to contact anyone from the team, you can find our emails below.

### Ben Henry

benhbcit@gmail.com

### Corey Buchan

cbuchan11@my.bcit.ca
xouwan021592@gmail.com

### Mansib Talukder

nabil99002@gmail.com

### Vincent Fung

vfung26@my.bcit.ca
eohndk@gmail.com

### Polina Omelyantseva

hehrytyz@gmail.com
