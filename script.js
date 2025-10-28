const experiment = {
  times: [],
  directions: [], // keeps track of the direction for each trial
  maxTrials: 10,
  waitHnd: -1,
  started: false,
  ended: false,
  stimulusWait: false,
  stimulusShown: false,
  stimulusShownAt: -1,
  btnDisabled: false,
  // stores 10 trials (5 of each) in random order
  remainingDirections: shuffle(["left","left","left","left","left","right","right","right","right","right"]),
    currentCondition: null, // displays left png or right based on this condition  
};

const btn = document.querySelector(".button-default");
const stimulus = document.querySelector(".circle");
// new selector for the <img> element inside the circle display
const arrowImage = document.querySelector("#arrow-image"); 

// randomise the order of trial arrows
function shuffle(array){
  return array.sort(() => Math.random() - 0.5);
}

const advanceTrial = function () {
  //reset stimulus
  updateStimulus("inactive");

  if (experiment.times.length < experiment.maxTrials) {
    //still need to run more trials
    experiment.stimulusShown = false; //reset
    scheduleStimulus();
  } else {
    //experiment ended
    experiment.stimulusShown = false;
    endExperiment();
  }
};

const endExperiment = function () {
  console.info("INFO: Experiment ended. Await download of results");

  experiment.ended = true;

  //Update Button Styling
  experiment.btnDisabled = false;
  btn.classList.toggle("button-enabled");
  btn.classList.toggle("button-disabled");
  btn.textContent = "Download Data";
};

const scheduleStimulus = function () {
  experiment.stimulusWait = true;
  const randomDelay = Math.floor(Math.random() * 4 + 2); // 2 - 5s
  experiment.waitHnd = window.setTimeout(showStimulus, randomDelay * 1000); //setTimeout runs in milliseconds
  console.info(
    "INFO: Trial",
    experiment.times.length,
    ". Random delay:",
    randomDelay
  );
};

const showStimulus = function () {
    experiment.currentCondition = experiment.remainingDirections.pop();

    // set the image source based on the arrow direction
    if (experiment.currentCondition === "left") {
        arrowImage.src = "arrow-left.png";
    }
    else {
        arrowImage.src = "arrow-right.png";
    }

  experiment.stimulusShownAt = Date.now();
  console.info(
    "INFO: Trial",
    experiment.times.length,
    "Direction:",
    experiment.currentCondition,
    ". Stimulus shown",
    experiment.stimulusShownAt
  );
  updateStimulus("active");
  experiment.stimulusWait = false;
  experiment.stimulusShown = true;
};

const updateStimulus = function (state) {
  const otherState = state == "active" ? "inactive" : "active";

  // when inactive state, clear the image source so it disappears
  if (state === "inactive") {
    arrowImage.src = "";
    stimulus.style.backgroundColor = "";
  }

  stimulus.classList.add(state);
  stimulus.classList.remove(otherState);
};

const logReaction = function () {
  let userReactedAt = Date.now();
  console.info("INFO: User reaction captured.", userReactedAt, "Direction:", experiment.currentCondition);

  let deltaTime = userReactedAt - experiment.stimulusShownAt;
  experiment.times.push(deltaTime);
  // store the matching direction for this attempt 
  experiment.directions.push(experiment.currentCondition);
  document.querySelector("#time").textContent = deltaTime + " ms";
};

const userReaction = function () {
  if (!experiment.started) {
    return;
  } //prior to start of experiment, ignore
  if (experiment.stimulusWait) {
    return;
  } //ignore false trigger reactions

  if (experiment.stimulusShown) {
    //stimulus is visible, capture
    logReaction();
    advanceTrial();
  }
};

const startExperiment = function () {
  console.info("INFO: Experiment Started");
  stimulus.style = "background-color:'';";
  document.querySelector("#instructions").style.display = "none";
  experiment.started = true;
  window.addEventListener("keypress", onKey); //add keylistener
  advanceTrial();
};

const btnAction = function () {
  console.debug("DBG:", "click");
  if(experiment.btnDisabled) return;
  if (!experiment.ended) {
    experiment.btnDisabled = true;
    btn.classList.toggle("button-enabled");
    btn.classList.toggle("button-disabled");
  }
  if (!experiment.started) {
    startExperiment();
  } else {
    if (experiment.ended) {
      exportExperimentLog();
      const stats = computeStatistics(experiment.times);
      document.querySelector("#time").textContent = [
        "Count:",
        stats.cnt,
        "Mean:",
        stats.mean.toFixed(2),
        "ms",
        "SD:",
        stats.sd.toFixed(2),
        "ms",
        // display the new left/right averages
        "Left Mean:",
        stats.leftMean.toFixed(2),
        "ms",
        "Right Mean:",
        stats.rightMean.toFixed(2),
        "ms",
      ].join(" ");
    } else {
      console.log("DBG: Should this occur?");
    }
  }
};

const computeStatistics = function (timeArr) {
    // calculate average for left and right arrow attempts
    let leftSum = 0;
    let rightSum = 0;

    for (let i = 0; i < experiment.directions.length; i++) {
        if (experiment.directions[i] === "left") {
            leftSum += timeArr[i];
        }
        else {
            rightSum += timeArr[i];
        }
    }

    let leftAverage = leftSum / 5;
    let rightAverage = rightSum / 5;

  //to get mean, get sum of all trials and divide by number of trials m = sum(x)/cnt(x)
  const sums = timeArr.reduce((acc, num) => acc + num, 0);
  const meanDeltaTime = sums / timeArr.length;

  //standard deviation is  sqrt(sum(x-mean)^2/cnt(x))
  const squaredDiffs = timeArr.reduce(
    (acc, num) => (num - meanDeltaTime) ** 2 + acc,
    0
  );
  const standardDeviationTime = Math.sqrt(squaredDiffs / timeArr.length);

  return {
    sd: standardDeviationTime,
    mean: meanDeltaTime,
    cnt: timeArr.length,
    leftMean: leftAverage,
    rightMean: rightAverage,
  };
};

const exportExperimentLog = function () {
  // CSV header to include direction
  let csvHeader = "pid,trial#,direction,reactionTime (ms)\n";
  let pid = Math.floor(Math.random() * 900000) + 100000;
  let csvData = experiment.times
    .map((time, idx) => [pid, idx + 1, experiment.directions[idx], time].join(","))
    .join("\n"); //map passes every record in the log array to the getCSVDataLine, we also need to include pid to all rows
  const stamp = new Date().toISOString().slice(0,19)
exportData(csvHeader + csvData, 'VisualReactionTestResults-' + stamp + '.csv');

};

const exportData = function (csvDataString, exportFileName) {
  // Create a Blob with the CSV data
  const blob = new Blob([csvDataString], { type: "text/csv" });

  // Create a temporary link element
  const a = document.createElement("a");
  a.href = window.URL.createObjectURL(blob);
  a.download = exportFileName;

  // Trigger the download
  document.body.appendChild(a);
  a.style.display = "none";
  a.click();

  // Clean up
  window.URL.revokeObjectURL(a.href);
  document.body.removeChild(a);
};

const onKey = function (evt) {
  if (evt == null) {
    evt = window.event;
  }
  switch (evt.which || evt.charCode || evt.keyCode) {
    case 32: //space
      userReaction();
      break;
    default:
      console.warn("WARN: Key:", evt, evt.which, evt.charCode, evt.keyCode);
  }
};

btn.addEventListener("click", btnAction);
