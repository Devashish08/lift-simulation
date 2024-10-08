/** @format */

document.addEventListener("DOMContentLoaded", () => {
  const startButton = document.getElementById("start-simulation");
  const floorsContainer = document.getElementById("floors-container");
  const liftsContainer = document.getElementById("lifts-container");
  let floors = [];
  let lifts = [];
  let floorHeight = 80; // Height of each floor in pixels
  let pendingRequests = [];

  startButton.addEventListener("click", startSimulation);

  function startSimulation() {
    if (
      document.getElementById("floors").value == "" ||
      document.getElementById("lifts").value == ""
    ) {
      alert(
        "Please enter valid numbers for floors (2 - 100) and lifts (1 - 100)"
      );
      return;
    }
    const numFloors = parseInt(document.getElementById("floors").value);
    const numLifts = parseInt(document.getElementById("lifts").value);

    if (numFloors < 2 || numLifts < 1 || numFloors > 500 || numLifts > 500) {
      alert(
        "Please enter valid numbers for floors (2 - 500) and lifts (1 - 500)"
      );
      return;
    }

    floorsContainer.innerHTML = "";
    liftsContainer.innerHTML = "";
    floors = [];
    lifts = [];
    pendingRequests = [];

    createFloors(numFloors);
    createLifts(numLifts);
    addFloorLines(numFloors);
  }

  function createFloors(numFloors) {
    for (let i = numFloors; i >= 1; i--) {
      const floor = document.createElement("div");
      floor.className = "floor";
      floor.innerHTML = `
        <div class="floor-buttons">
          ${
            i < numFloors
              ? `<button class="floor-button up-button" data-floor="${i}" data-direction="up">Up</button>`
              : ""
          }
          ${
            i > 1
              ? `<button class="floor-button down-button" data-floor="${i}" data-direction="down">Down</button>`
              : ""
          }
          <div class="floor-number">${i}</div>
        </div>
      `;
      floorsContainer.appendChild(floor);
      floors.push(floor);
    }
    addFloorButtonListeners();
  }

  function createLifts(numLifts) {
    document.documentElement.style.setProperty("--num-lifts", numLifts);
    const liftWidth = 80; // Width of each lift
    for (let i = 0; i < numLifts; i++) {
      const lift = document.createElement("div");
      lift.className = "lift";
      lift.innerHTML = `
      <div class="lift-doors">
        <div class="lift-door lift-door-left"></div>
        <div class="lift-door lift-door-right"></div>
      </div>
    `;
      lift.style.left = `${i * liftWidth}px`; // Position based on index
      lift.style.bottom = "0px"; // Start at the first floor
      liftsContainer.appendChild(lift);
      lifts.push({
        element: lift,
        currentFloor: 1,
        targetFloors: [],
        destinationFloors: [], // Track all floors the lift is heading towards
        isMoving: false
      });
    }
  }

  function addFloorLines(numFloors) {
    for (let i = 1; i < numFloors; i++) {
      const floorLine = document.createElement("div");
      floorLine.className = "floor-line";
      floorLine.style.bottom = `${i * floorHeight}px`;
      floorsContainer.appendChild(floorLine);
    }
  }

  function addFloorButtonListeners() {
    const floorButtons = document.querySelectorAll(".floor-button");
    floorButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        const targetFloor = parseInt(e.target.getAttribute("data-floor"));
        const direction = e.target.getAttribute("data-direction");

        // Disable only the pressed button (up or down)
        disableButton(e.target);

        requestLift(targetFloor, direction);
      });
    });
  }

  function disableButton(button) {
    button.disabled = true; // Disable only the button that was pressed (up or down)
  }

  function enableButton(button) {
    button.disabled = false; // Re-enable the button after the lift completes its task
  }

  function enableButtonByDirection(floor, direction) {
    const button = document.querySelector(
      `.floor-button[data-floor="${floor}"][data-direction="${direction}"]`
    );
    if (button) {
      enableButton(button); // Re-enable the button for the specific direction
    }
  }

  function requestLift(targetFloor, direction) {
    // Check if a lift is already heading to the target floor in the same direction
    const liftHeadingToFloor = lifts.some((lift) =>
      lift.destinationFloors.some(
        (dest) => dest.floor === targetFloor && dest.direction === direction
      )
    );
    if (liftHeadingToFloor) {
      console.log(`Lift already heading to floor ${targetFloor} ${direction}`);
      return; // If a lift is already heading to the target floor, do nothing
    }

    // Check for idle lifts on the same floor
    const idleLiftsOnSameFloor = lifts.filter(
      (lift) => lift.currentFloor === targetFloor && !lift.isMoving
    );
    if (idleLiftsOnSameFloor.length > 0) {
      const nearestIdleLift = idleLiftsOnSameFloor[0];
      assignLiftToFloor(nearestIdleLift, targetFloor, direction);
      return;
    }

    // Check for other idle lifts
    const idleLifts = lifts.filter((lift) => !lift.isMoving);
    if (idleLifts.length > 0) {
      const nearestIdleLift = idleLifts.reduce((prev, curr) =>
        Math.abs(curr.currentFloor - targetFloor) <
        Math.abs(prev.currentFloor - targetFloor)
          ? curr
          : prev
      );
      assignLiftToFloor(nearestIdleLift, targetFloor, direction);
      return;
    }

    // If no idle lifts are available, add the request to the pending queue
    if (
      !pendingRequests.some(
        (req) => req.floor === targetFloor && req.direction === direction
      )
    ) {
      pendingRequests.push({ floor: targetFloor, direction });
    }
  }

  function assignLiftToFloor(lift, targetFloor, direction) {
    if (
      !lift.destinationFloors.some(
        (dest) => dest.floor === targetFloor && dest.direction === direction
      )
    ) {
      lift.targetFloors.push({ floor: targetFloor, direction });
      lift.destinationFloors.push({ floor: targetFloor, direction });
      if (!lift.isMoving) {
        moveLift(lift);
      }
    }
  }

  async function moveLift(lift) {
    lift.isMoving = true;
    const targetFloorObj = lift.targetFloors.shift();
    const targetFloor = targetFloorObj.floor;
    const targetDirection = targetFloorObj.direction;
    const translateY = (targetFloor - 1) * floorHeight;
    const floorsToMove = Math.abs(lift.currentFloor - targetFloor);
    const moveTime = floorsToMove * 2000; // 2 seconds per floor

    lift.element.style.transition = `transform ${moveTime}ms linear`;
    lift.element.style.transform = `translateY(-${translateY}px)`;
    await wait(moveTime); // Simulate movement time

    await openCloseDoors(lift);

    lift.currentFloor = targetFloor; // Update the lift's current floor
    lift.isMoving = false;
    lift.destinationFloors = lift.destinationFloors.filter(
      (dest) =>
        dest.floor !== targetFloor ||
        dest.direction !== targetFloorObj.direction
    ); // Remove the reached floor from destinationFloors

    // Re-enable only the button that was pressed (up or down) after lift completes the task
    enableButtonByDirection(targetFloor, targetDirection);

    // Check for pending requests after completing this move
    checkPendingRequests();

    if (lift.targetFloors.length > 0) {
      moveLift(lift);
    }
  }

  function openCloseDoors(lift) {
    return new Promise((resolve) => {
      lift.element.classList.add("doors-opening");
      setTimeout(() => {
        lift.element.classList.remove("doors-opening");
        lift.element.classList.add("doors-closing");
        setTimeout(() => {
          lift.element.classList.remove("doors-closing");
          resolve();
        }, 2500);
      }, 2500);
    });
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function checkPendingRequests() {
    if (pendingRequests.length > 0) {
      const nextRequest = pendingRequests.shift();
      const availableLifts = lifts.filter((lift) => !lift.isMoving);

      if (availableLifts.length > 0) {
        const nearestLift = availableLifts.reduce((prev, curr) =>
          Math.abs(curr.currentFloor - nextRequest.floor) <
          Math.abs(prev.currentFloor - nextRequest.floor)
            ? curr
            : prev
        );
        assignLiftToFloor(
          nearestLift,
          nextRequest.floor,
          nextRequest.direction
        );
      } else {
        // If no lifts are available, put the request back in the queue
        pendingRequests.unshift(nextRequest);
      }
    }
  }

  function enableFloorButtons(floor) {
    const floorButtons = document.querySelectorAll(
      `.floor-button[data-floor="${floor}"]`
    );
    floorButtons.forEach((button) => {
      button.disabled = false;
    });
  }
});
