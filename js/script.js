let currentSong = new Audio();
let currFolder;
let songs = [];

const previous = document.getElementById("previous");
const next = document.getElementById("next");
const play = document.getElementById("play");

function truncateSongName(name, wordLimit = 3) {
    const words = name.split(" ");
    if (words.length > wordLimit) {
        return words.slice(0, wordLimit).join(" ") + " ...";
    }
    return name;
}

async function getSongs(folder) {
    currFolder = folder;
    let response = await fetch(`/${folder}/`);
    let text = await response.text();

    let div = document.createElement("div");
    div.innerHTML = text;

    let as = div.getElementsByTagName("a");
    songs = [];
    for (let index = 0; index < as.length; index++) {
        const element = as[index];
        if (element.href.endsWith(".mp3") || element.href.endsWith(".m4a")) {
            const decodedName = decodeURIComponent(element.href.split(`/${folder}/`)[1]);
            const truncatedName = truncateSongName(decodedName.replaceAll("%20", " "));
            songs.push({ fullName: decodedName, displayName: truncatedName });
        }
    }

    // show all songs in the playlist
    let songUl = document.querySelector(".songList ul");
    songUl.innerHTML = "";
    for (const song of songs) {
        songUl.innerHTML += `
        <li class="flex">
            <img class="invert" src="/img/player.svg" alt="music">
            <div class="info">
                <div>${song.displayName}</div>
                <div class="artistName">Artist Name</div>
            </div>
            <img class="invert play-button" src="/img/play.svg" alt="play">
        </li>`;
    }
    
    // Attach an event listener to each song
    Array.from(document.querySelector(".songList").getElementsByTagName("li")).forEach((e, index) => {
        e.addEventListener("click", () => {
            playMusic(index);
        });
    });
    return songs;
}

function secondsToMinutes(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(remainingSeconds).padStart(2, '0');
    return `${formattedMinutes}:${formattedSeconds}`;
}

const playMusic = (index, pause = false) => {
    currentSong.src = `/${currFolder}/` + songs[index].fullName;
    play.src = "/img/play1.svg";
    if (!pause) {
        currentSong.play();
        play.src = "/img/pause.svg";
    }
    const displayTrackName = songs[index].displayName;
    document.getElementById("playbar_songName").innerHTML = displayTrackName;
    document.querySelector(".songTime").innerHTML = "00:00 / 00:00";
    currentSong.setAttribute("data-current-index", index);
}

async function displayAlbums() {
    try {
        console.log("Fetching albums...");
        let response = await fetch(`/songs/`);
        if (!response.ok) {
            throw new Error(`Failed to load: ${response.status}`);
        }
        let text = await response.text();
        console.log("Albums response text:", text);

        let div = document.createElement("div");
        div.innerHTML = text;
        let anchors = div.getElementsByTagName("a");
        console.log("Found anchors:", anchors);

        let cardContainer = document.querySelector(".card_container");
        if (!cardContainer) {
            throw new Error("Card container not found in the DOM");
        }

        // Clear existing cards
        cardContainer.innerHTML = "";

        let array = Array.from(anchors);
        for (let index = 0; index < array.length; index++) {
            const e = array[index];
            console.log("Processing anchor:", e.href);

            if (e.href.includes("/songs/") && !e.href.includes(".htaccess")) {
                let folder = e.href.split("/").slice(-1)[0];
                try {
                    console.log(`Fetching metadata for folder: ${folder}`);
                    let metadataResponse = await fetch(`/songs/${folder}/info.json`);
                    if (!metadataResponse.ok) {
                        throw new Error(`Failed to load metadata for ${folder}: ${metadataResponse.status}`);
                    }
                    let metadata = await metadataResponse.json();
                    console.log("Metadata:", metadata);

                    cardContainer.innerHTML += `
                    <div data-folder="${folder}" class="card">
                        <div class="play">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="40" height="40">
                                <circle cx="12" cy="12" r="12" fill="green" />
                                <g transform="translate(2, 2)">
                                    <path
                                    d="M13.4531 10.3948C13.3016 11.0215 12.5857 11.4644 11.1539 12.3502C9.7697 13.2064 9.0777 13.6346 8.5199 13.4625C8.2893 13.3913 8.0793 13.2562 7.9098 13.07C7.5 12.6198 7.5 11.7465 7.5 10C7.5 8.2535 7.5 7.38018 7.9098 6.92995C8.0793 6.74381 8.2893 6.60868 8.5199 6.53753C9.0777 6.36544 9.7697 6.79357 11.1539 7.64983C12.5857 8.5356 13.3016 8.9785 13.4531 9.6052C13.5156 9.8639 13.5156 10.1361 13.4531 10.3948Z"
                                    fill="black" />
                                </g>
                            </svg>
                        </div>
                        <img src="/songs/${folder}/cover.jpg" alt="card">
                        <h3>${metadata.title}</h3>
                        <p>${metadata.description}</p>
                    </div>`;
                } catch (error) {
                    console.error(`Error fetching metadata for ${folder}:`, error);
                }
            }
        }

        // on card click the playlist will change
        Array.from(document.getElementsByClassName("card")).forEach(e => {
            e.addEventListener("click", async item => {
                await getSongs(`songs/${item.currentTarget.dataset.folder}`);
                playMusic(0, true);
            });
        });

        // Add event listeners to cards to update the library name
        Array.from(document.getElementsByClassName("card")).forEach(e => {
            e.addEventListener("click", async item => {
                const updatedName = e.querySelector("h3").innerText;
                await updatelab(updatedName);
            });
        });
    } catch (error) {
        console.error("Error displaying albums:", error);
    }
}

async function updatelab(updatedName) {
    document.getElementById("libraury_update").innerHTML = updatedName;
}

async function main() {
    await getSongs("songs/UI");
    playMusic(0, true);

    displayAlbums();

    play.addEventListener("click", async () => {
        if (currentSong.paused) {
            currentSong.play();
            play.src = "/img/pause.svg";
        } else {
            currentSong.pause();
            play.src = "/img/play1.svg";
        }
    });

    // Hamburger menu event listener
    document.querySelector(".hamburger").addEventListener("click", e => {
        document.querySelector(".left").style.left = "0px";
    });

    // Close button event listener
    document.querySelector(".close").addEventListener("click", e => {
        document.querySelector(".left").style.left = "-300px";
    });

    // Time update
    currentSong.addEventListener("timeupdate", () => {
        if (!isNaN(currentSong.duration)) {
            document.querySelector(".songTime").innerHTML = `${secondsToMinutes(currentSong.currentTime)}/${secondsToMinutes(currentSong.duration)}`;
            document.querySelector(".circle").style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";
            document.querySelector(".progress").style.width = (currentSong.currentTime / currentSong.duration) * 100 + "%";
        }
    });

    // Add event listener to previous button
    previous.addEventListener("click", e => {
        let index = parseInt(currentSong.getAttribute("data-current-index"), 10);
        if (index > 0) {
            playMusic(index - 1);
        }
    });

    // Add event listener to next button
    next.addEventListener("click", e => {
        let index = parseInt(currentSong.getAttribute("data-current-index"), 10);
        if (index < songs.length - 1) {
            playMusic(index + 1);
        }
    });

    // Mute and unmute button event listener
    const muteButton = document.getElementById("mute");
    muteButton.src = "/img/mute.svg";
    muteButton.addEventListener("click", () => {
        currentSong.muted = !currentSong.muted;
        if (currentSong.muted) {
            muteButton.src = "/img/unmute.svg";
            currentSong.pause();
            play.src = "/img/play1.svg";
        } else {
            muteButton.src = "/img/mute.svg";
            currentSong.play();
            play.src = "/img/pause.svg";
        }
    });

    // seekbar event listener
    document.querySelector(".seekbar").addEventListener("click", e => {
        let percent = (e.offsetX / e.target.getBoundingClientRect().width) * 100;
        document.querySelector(".circle").style.left = percent + "%";
        currentSong.currentTime = ((currentSong.duration) * percent) / 100;
    });
}

main();
