const experiment = {
  times: [],
  maxTrials: 10,
  waitHnd: -1,
  started: false,
  ended: false,
  stimulusWait: false,
  stimulusShown: false,
  stimulusStartedAt: -1,
  btnDisabled: false,
};

const btn = document.querySelector(".button-default");
const stimulus = document.querySelector(".circle");
const audio = document.querySelector("#audio"); // new Audio("");

// audio.play();

const advanceTrial = function () {
  //reset stimulus
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
  experiment.stimulusStartedAt = Date.now();
  console.info(
    "INFO: Trial",
    experiment.times.length,
    ". Stimulus Started",
    experiment.stimulusStartedAt
  );
  audio.play();
  experiment.stimulusWait = false;
  experiment.stimulusShown = true;
};

const logReaction = function () {
  let userReactedAt = Date.now();
  console.info("INFO: User reaction captured.", userReactedAt);

  let deltaTime = userReactedAt - experiment.stimulusStartedAt;
  experiment.times.push(deltaTime);
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
  document.querySelector("#instructions").style.display = "none";
  experiment.started = true;
  window.addEventListener("keypress", onKey); //add keylistener
  advanceTrial();
};

const btnAction = function () {
  console.debug("DBG:", "click");
  if (experiment.btnDisabled) return;
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
        "Mean (Start):",
        stats.mean.toFixed(2),
        "ms",
        "SD (Start):",
        stats.sd.toFixed(2),
        "ms",
      ].join(" ");
    } else {
      console.log("DBG: Should this occur?");
    }
  }
};

const computeStatistics = function (timeArr) {
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
  };
};

const exportExperimentLog = function () {
  let csvHeader = "pid,trial#,reactionTime (ms)\n";
  let pid = Math.floor(Math.random() * 900000) + 100000;
  let csvData = experiment.times
    .map((time, idx) => [pid, idx, time].join(","))
    .join("\n"); //map passes every record in the log array to the getCSVDataLine, we also need to include pid to all rows
  exportData(csvHeader + csvData, "AuditiveReactionTestResults.csv");
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
audio.play();
btn.addEventListener("click", btnAction);
