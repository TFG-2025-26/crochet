# Hook3D!, a tool for crochet simulation

Hook3D is a web aplication that translates from a crochet pattern to a 3D mesh so you can see how your newest project will look like without even picking up a crochet hook. It is also a great tool to help beginners with pattern writting.





## Developer's Manual:

# General Information

-   Project Name: Hook3D

-   Author: María Solórzano Gómez

-   Main Technologies: HTML, CSS, JavaScript, Three.js

-   Repository: <https://github.com/TFG-2025-26/crochet>

-   License: GLP

# System Requirements

## Hardware

This is a relatively lightweight application, and the only significant
hardware requirement is a WebGL-compatible GPU.

## Software

-   Node.js

-   npx

-   Git or GitHub Desktop

-   Any web browser (Recommended: Firefox)

-   Any JavaScript editor (Recommended: Visual Studio Code, WebStorm)

## Libraries Used

-   Three.js (3D rendering)

-   Vite (Development and build environment)

# Development Environment Setup

First, you must clone the repository, which is hosted on the GitHub
mentioned above.

Once cloned, you must install the dependencies. To do this, in the
project folder, open a terminal and run:

``` {.Bash language="Bash"}
npx install
```

To start the server, run:

``` {.Bash language="Bash"}
npx vite
```

The application will be available at: `http://localhost:5173`

# Project Structure

This is the current project hierarchy:

project/

├── paperwork/

├── bib/

├── node_modules/

├── src/

│     ├── index.html

│     ├── main.js

│     ├── icon.ico

│     └── banner.png

├── package.json

├── package-lock.json

└── README.md

The most important part of the code takes place in the main.js file.



