/*
 * Copyright (c) 2023 Sony Semiconductor Solutions Corporation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
*/

/* eslint-disable no-unused-vars */
/* eslint-disable prefer-const */
/* eslint-disable no-undef */
let expiresOn = ''
let hubConnection
let start
let currentDeviceId
let currentModelId
let captureThresholdSlider = document.getElementById('captureThresholdSlider')
let captureThresholdSliderLabel = document.getElementById('captureThresholdSliderLabel')
let captureFrequencySlider = document.getElementById('captureFrequencySlider')
let captureFrequencySliderLabel = document.getElementById('captureFrequencySliderLabel')
let captureIoUThresholdSlider = document.getElementById('captureIoUThresholdSlider')
let captureIoUThresholdSliderLabel = document.getElementById('captureIoUThresholdSliderLabel')
let zoneDetectionThresholdSlider = document.getElementById('zoneDetectionThresholdSlider')
let zoneDetectionThresholdLabel = document.getElementById('zoneDetectionThresholdSliderLabel')
let zoneDetectionIoUThresholdSlider = document.getElementById('zoneDetectionIoUThresholdSlider')
let zoneDetectionIoUThresholdLabel = document.getElementById('zoneDetectionIoUThresholdSliderLabel')
let zoneDetectionFrequencySlider = document.getElementById('zoneDetectionFrequencySlider')
let zoneDetectionFrequencyLabel = document.getElementById('zoneDetectionFrequencySliderLabel')
let zoneDetectionNotificationPeriodSlider = document.getElementById('zoneDetectionNotificationPeriodSlider')
let zoneDetectionNotificationPeriodLabel = document.getElementById('zoneDetectionNotificationPeriodSliderLabel')
let thresholdSliderHandler
let imageCountSliderHandler
let IoUThresholdSliderHandler
let zoneDetectionFrequencySpinnerHandler
let zoneDetectionThresholdSliderHandler
let zoneDetectionIoUThresholdSliderHandler
let frequencySpinnerHandler
let barChart
let currentThreshold = 0.8
let currentIoUThreshold = 0
let currentNotificationPeriod = 30
let isZoneDetectionRunning = false
let rectZone = [-1, -1, -1, -1]
let capturePhotoUrl
let token
let pplMode = 0
const COMMAND_PARAM_FILE_NAME = 'ST_COMMAND_PARAM.json'
let testDetectionFlg = false
let elapsedTimer
let nowTime
let lastUpdateTime
const chartOptions = {
  legend: {
    display: false
  },
  scales: {
    x: {
      display: true,
      type: 'timeseries',
      time: {
        unit: 'second'
      },
      ticks: {
        source: 'data'
      },
      grid: {
        display: false
      }
    },
    y: {
      display: true,
      suggestedMax: 5,
      beginAtZero: true,
      ticks: {
        stepSize: 1
      },
      title: {
        display: true,
        text: 'Number of Object',
        font: {
          size: 15
        }
      }
    }
  },
  plugins: {
    legend: false
  }
}

const chartData = {
  labels: [],
  datasets: [
    {
      label: 'Inference Results',
      backgroundColor: 'rgba(75,192,192,0.9)',
      borderWidth: 0,
      barPercentage: 1.0,
      categoryPercentage: 1.0,
      clip: 5,
      data: []
    }
  ]
}

$(document).ready(async function () {
  toggleLoader(false)
  console.debug('Zone Detection : document.Ready')
  initCaptureCanvas('captureImageCanvasZoneOverlay', 'captureImageCanvasOverlay', 'captureImageCanvas')
  ClearCaptureCanvas()

  hubConnection = new signalR.HubConnectionBuilder()
    .withUrl('telemetryHub')
    .configureLogging(signalR.LogLevel.Debug)
    .build()

  hubConnection.on('DeviceTelemetry', function (payload) {
    printTime('=> Telemetry')
    if (isZoneDetectionRunning === true) {
      telemetryEventsProcessMessage(payload, barChart, currentThreshold, currentIoUThreshold, currentNotificationPeriod)
    } else {
      testDetectionProcessMessage(payload, currentThreshold, currentIoUThreshold, testDetectionFlg)
    }
  })

  hubConnection.start()
    .then(() => console.log('SignalR connected!'))
    .catch(console.error)

  const barChartCanvas = $('#barChart').get(0).getContext('2d')
  barChart = new Chart(barChartCanvas, {
    backgroundColor: 'transparent',
    type: 'bar',
    data: chartData,
    options: chartOptions
  })

  await getToken()
    .then(async () => {
      console.log('Get Token')
    })
    .catch(() => {
      alert('Failed to acquire token.')
    })
    .finally(() => {
    })

  if (document.cookie.length > 0) {
    const settings = parseCookie(document.cookie)

    if (settings.ZoneDetectionDevId !== undefined) {
      currentDeviceId = settings.ZoneDetectionDevId
    }

    if (settings.capturePhotoUrl !== undefined) {
      capturePhotoUrl = settings.capturePhotoUrl
    }

    if (currentDeviceId !== undefined) {
      // Set up UI with initial values
      await SetDeviceLists(currentDeviceId)
    }

    if (currentDeviceId !== undefined && currentModelId !== undefined && capturePhotoUrl !== undefined) {
      // $('#accordionCaptureImage').collapse('toggle')
      await SetCaptureCanvas(capturePhotoUrl, rectZone)
    }
    console.debug(`Dev   : ${currentDeviceId}`)
    console.debug(`Model : ${currentModelId}`)
    console.debug(`Url   : ${capturePhotoUrl}`)
    console.debug(`Rect  : ${rectZone[0]}, ${rectZone[1]}, ${rectZone[2]}, ${rectZone[3]}`)
  }

  captureThresholdSliderLabel.innerHTML = captureThresholdSlider.value
  captureFrequencySliderLabel.innerHTML = captureFrequencySlider.value
  captureIoUThresholdSliderLabel.innerHTML = captureIoUThresholdSlider.value

  zoneDetectionThresholdLabel.innerHTML = zoneDetectionThresholdSlider.value
  zoneDetectionIoUThresholdLabel.innerHTML = zoneDetectionIoUThresholdSlider.value
  zoneDetectionFrequencySliderLabel.innerHTML = zoneDetectionFrequencySlider.value
  zoneDetectionNotificationPeriodLabel.innerHTML = zoneDetectionNotificationPeriodSlider.value

  toggleLoader(true)
})

//
// button clicks
//
$('#copyTokenBtn').click(function () {
  navigator.clipboard.writeText(document.getElementById('taToken').value)
})

$('#pasteTokenBtn').click(function () {
  navigator.clipboard.readText()
    .then(clipText => {
      document.getElementById('taToken').value = clipText
      document.getElementById('taToken').dispatchEvent(new Event('change'))
    })
    .catch(err => {
      console.log('Could not read clipboard', err)
    })
})

$('#getTokenBtn').click(function () {
  if ($('#loginForm').valid()) {
    toggleLoader(false)
    getToken()
      .then(() => {
        console.log('Get Token')
      })
      .finally(() => {
        toggleLoader(true)
      })
  }
})

//
// Change event
//
$('#taToken').on('change', function (evt) {
  console.debug(evt.target.id + '() ' + evt.type)
  $('#copyTokenBtn').prop('disabled', false)
})

// //////////////////////////////////////////////////////////////
// Accordions
// //////////////////////////////////////////////////////////////
$('#accordionCaptureImage').on('show.bs.collapse', async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const resultElementId = 'captureImageBtnResult'
  const deviceListId = 'captureDeviceIdList'

  if (document.getElementById(deviceListId).length === 0) {
    // List empty.  Gather device list.

    toggleLoader(false)

    await GetDevices(deviceListId, true, false, 'Select Device', '0', resultElementId)
      .then((response) => {
        if (response === false) {
          // handle error?
        }
      })
      .catch(() => {
      })
      .finally(() => {
        toggleLoader(true)
      })
  }
})

$('#accordionSpecifyZone').on('show.bs.collapse', function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  enableDisableMouseEvent(true)

  $('#region_x').html(rectZone[0].toString().padStart(3, ' '))
  $('#region_y').html(rectZone[1].toString().padStart(3, ' '))

  $('#region_w').html(rectZone[2].toString().padStart(3, ' '))
  $('#region_h').html(rectZone[3].toString().padStart(3, ' '))
})

$('#accordionSpecifyZone').on('hide.bs.collapse', function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  enableDisableMouseEvent(false)
})

$('#accordionStartInference').on('show.bs.collapse', function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)

  // Add event listeners for sliders if not set.  Otherwise, just enable sliders.
  if (captureThresholdSlider.getAttribute('inputListner') == null) {
    captureThresholdSlider.addEventListener('input', function thresholdSliderHandler (evt) {
      captureThresholdSliderLabel.innerHTML = evt.target.value
      zoneDetectionThresholdSlider.value = evt.target.value
      zoneDetectionThresholdSliderLabel.innerHTML = evt.target.value
      currentThreshold = parseInt(evt.target.value) / 100
    })
    captureThresholdSlider.setAttribute('inputListner', 'true')
  } else {
    captureThresholdSlider.disabled = false
  }

  if (captureFrequencySlider.getAttribute('inputListner') == null) {
    captureFrequencySlider.addEventListener('input', function frequencySliderHandler (evt) {
      // for capture, don't capture < 10 sec interval
      captureFrequencySlider.value = evt.target.value
      captureFrequencySliderLabel.innerHTML = evt.target.value
      zoneDetectionFrequencySlider.value = evt.target.value
      zoneDetectionFrequencyLabel.innerHTML = evt.target.value

      const NotificationSliderValue = parseInt(zoneDetectionNotificationPeriodSlider.value)
      if (NotificationSliderValue < parseInt(evt.target.value)) {
        zoneDetectionNotificationPeriodSlider.value = evt.target.value
        zoneDetectionNotificationPeriodSliderLabel.innerHTML = evt.target.value
      }
    })
    captureFrequencySlider.setAttribute('inputListner', 'true')
  } else {
    captureFrequencySlider.disabled = false
  }

  if (captureIoUThresholdSlider.getAttribute('inputListner') == null) {
    captureIoUThresholdSlider.addEventListener('input', function IoUThresholdSliderHandler (evt) {
      zoneDetectionIoUThresholdSlider.value = evt.target.value
      zoneDetectionIoUThresholdSliderLabel.innerHTML = evt.target.value
      captureIoUThresholdSliderLabel.innerHTML = evt.target.value
      currentIoUThreshold = parseInt(evt.target.value) / 100
    })
    captureIoUThresholdSlider.setAttribute('inputListner', 'true')
  } else {
    captureIoUThresholdSlider.disabled = false
  }
})

$('#accordionSaveParameter').on('show.bs.collapse', function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  if ((currentDeviceId === undefined) || (currentModelId === undefined)) {
    $('#captureSaveParameterBtn').prop('disabled', true)
    return
  }

  $('#captureSaveParameterBtn').prop('disabled', false)
})

// //////////////////////////////////////////////////////////////
// Tabs
// //////////////////////////////////////////////////////////////
// Populate device list and model list when the tab is opened.
$('#tab-telemetry-label').on('show.bs.tab', async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const resultElementId = 'startZoneDetectionBtnResult'
  const deviceListId = 'zoneDetectionDeviceIdList'

  // only the first time
  if (document.getElementById(deviceListId).length === 0) {
    toggleLoader(false)
    // List empty.  Gather device list.
    await GetDevices(deviceListId, true, false, 'Select Device', '0', resultElementId)
      .then((response) => {
        if (response === false) {
          // handle error?
        }
      })
      .catch(() => {
      })
      .finally(() => {
        toggleLoader(true)
      })
  }

  // Set selected device
  if (currentDeviceId !== undefined) {
    setSelectOption('zoneDetectionDeviceIdList', currentDeviceId)
  }

  // Add event listeners for sliders if not set.  Otherwise, just enable sliders.
  if (zoneDetectionThresholdSlider.getAttribute('inputListner') == null) {
    zoneDetectionThresholdSlider.addEventListener('input', function zoneDetectionThresholdSliderHandler (evt) {
      captureThresholdSlider.value = evt.target.value
      captureThresholdSliderLabel.innerHTML = evt.target.value
      zoneDetectionThresholdLabel.innerHTML = evt.target.value
      currentThreshold = parseInt(evt.target.value) / 100
    })
    zoneDetectionThresholdSlider.setAttribute('inputListner', 'true')
  } else {
    zoneDetectionThresholdSlider.disabled = false
  }

  if (zoneDetectionIoUThresholdSlider.getAttribute('inputListner') == null) {
    zoneDetectionIoUThresholdSlider.addEventListener('input', function zoneDetectionIoUThresholdSliderHandler (evt) {
      captureIoUThresholdSlider.value = evt.target.value
      captureIoUThresholdSliderLabel.innerHTML = evt.target.value
      zoneDetectionIoUThresholdLabel.innerHTML = evt.target.value
      currentIoUThreshold = parseInt(evt.target.value) / 100
    })
    zoneDetectionIoUThresholdSlider.setAttribute('inputListner', 'true')
  } else {
    zoneDetectionIoUThresholdSlider.disabled = false
  }

  if (zoneDetectionFrequencySlider.getAttribute('inputListner') == null) {
    zoneDetectionFrequencySlider.addEventListener('input', function zoneDetectionFrequencySliderHandler (evt) {
      // for capture, don't capture < 10 sec interval
      captureFrequencySlider.value = Math.max(evt.target.value, 10)
      captureFrequencySliderLabel.innerHTML = Math.max(evt.target.value, 10)
      zoneDetectionFrequencyLabel.innerHTML = evt.target.value

      const NotificationSliderValue = parseInt(zoneDetectionNotificationPeriodSlider.value)

      if (NotificationSliderValue < parseInt(evt.target.value)) {
        zoneDetectionNotificationPeriodSlider.value = evt.target.value
        zoneDetectionNotificationPeriodLabel.innerHTML = evt.target.value
      }
    })
    zoneDetectionFrequencySlider.setAttribute('inputListner', 'true')
  } else {
    zoneDetectionFrequencySlider.disabled = false
  }

  if (zoneDetectionNotificationPeriodSlider.getAttribute('inputListner') == null) {
    zoneDetectionNotificationPeriodSlider.addEventListener('input', function zoneDetectionNotificationPeriodSliderHandler (evt) {
      const frequencyValue = parseInt(zoneDetectionFrequencySlider.value)
      let value = parseInt(evt.target.value)

      if (frequencyValue > value) {
        alert(`Notification Period must be greather than or equal to capture frequency.  Setting to ${frequencyValue} sec`)
        value = frequencyValue
      }

      zoneDetectionNotificationPeriodLabel.innerHTML = value.toString()
      currentNotificationPeriod = value.toString()
    })
    zoneDetectionNotificationPeriodSlider.setAttribute('inputListner', 'true')
  } else {
    zoneDetectionNotificationPeriodSlider.disabled = false
  }
})

// Disable sliders when the tab is unselected
$('#tab-telemetry-label').on('hide.bs.tab', async function (evt) {
  if (zoneDetectionThresholdSlider.getAttribute('inputListner') === 'true') {
    zoneDetectionThresholdSlider.disabled = true
  }

  if (zoneDetectionIoUThresholdSlider.getAttribute('inputListner') === 'true') {
    zoneDetectionIoUThresholdSlider.disabled = true
  }

  if (zoneDetectionFrequencySlider.getAttribute('inputListner') === 'true') {
    zoneDetectionFrequencySlider.disabled = true
  }

  if (zoneDetectionNotificationPeriodSlider.getAttribute('inputListner') === 'true') {
    zoneDetectionNotificationPeriodSlider.disabled = true
  }
})

// //////////////////////////////////////////////////////////////
// List Change events
// //////////////////////////////////////////////////////////////
$('#captureDeviceIdList').on('change', async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const targetListId = evt.target.id
  const modelListId = 'captureModelIdList'
  const deviceList = document.getElementById(targetListId)
  const resultElementId = 'captureImageBtnResult'

  // populate model list if
  // current device is not selected
  // selected device is changed
  // model list is empty
  if ((currentDeviceId === undefined) || (currentDeviceId !== deviceList[deviceList.selectedIndex].value) || (document.getElementById(modelListId).length === 0)) {
    // a different device is selected.  Clear current model id.
    if (currentDeviceId !== deviceList[deviceList.selectedIndex].value) {
      currentModelId = undefined
    }

    currentDeviceId = deviceList[deviceList.selectedIndex].value
    toggleLoader(false)
    await GetModelForDevice(modelListId, currentDeviceId, resultElementId)
      .then(async function (isDisconnected) {
        deviceList[deviceList.selectedIndex].setAttribute('data-isDisconnected', isDisconnected)

        if (isDisconnected === false) {
          // Make sure the device is not running inference.
          await StopInference(null)
        }
        await SetFromCommandParameterToDOM()
        // model is already selected.  Set selected model and dispatch change event
        if (currentModelId !== undefined) {
          document.getElementById(modelListId).value = currentModelId
          document.getElementById(modelListId).dispatchEvent(new Event('change'))
        }
      })
      .catch(() => {
        const resultElement = document.getElementById(resultElementId)
        setResultElement(resultElement, 'Failed to retrieve model list')
      })
      .finally(() => {
        toggleLoader(true)
      })
  }
})

$('#captureModelIdList').on('change', function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const targetListId = evt.target.id
  const deviceListId = 'captureDeviceIdList'
  const modelList = document.getElementById(targetListId)
  const deviceList = document.getElementById(deviceListId)
  if (modelList.selectedIndex > 0) {
    // a model is selected
    currentModelId = modelList[modelList.selectedIndex].value
    disableUiElements(false)
  } else {
    disableUiElements(true)
  }

  // device and model are selected.  Check to see if the device is connected or not.
  // If the device is online, enable capture button.
  if (deviceList.selectedIndex > 0 && modelList.selectedIndex > 0) {
    const isDisconnected = (deviceList[deviceList.selectedIndex].getAttribute('data-isDisconnected') === 'true')
    $('#captureImageBtn').prop('disabled', isDisconnected)
  }
})

$('#zoneDetectionDeviceIdList').on('change', async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const targetListId = evt.target.id
  const modelListId = 'zoneDetectionModelIdList'
  const resultElementId = 'startZoneDetectionBtnResult'
  const deviceList = document.getElementById(targetListId)

  if (currentDeviceId !== deviceList[deviceList.selectedIndex].value) {
    currentModelId = undefined
  }

  currentDeviceId = deviceList[deviceList.selectedIndex].value

  toggleLoader(false)

  // update the model list.
  await GetModelForDevice(modelListId, currentDeviceId, resultElementId)
    .then(async function (isDisconnected) {
      const modelList = document.getElementById(modelListId)

      deviceList[deviceList.selectedIndex].setAttribute('data-isDisconnected', isDisconnected)

      // enable/disable start buttons based on connection state
      if (modelList.selectedIndex > 0 && isDisconnected === false) {
        $('#startZoneDetectionBtn').prop('disabled', false)
        $('#startZoneDetectionWithImageBtn').prop('disabled', false)
      } else {
        $('#startZoneDetectionBtn').prop('disabled', true)
        $('#startZoneDetectionWithImageBtn').prop('disabled', true)
      }

      // make sure the device is not running inference.
      if (isDisconnected === false) {
        await StopInference(null)
      }

      // set selected model
      if (currentModelId !== undefined) {
        setSelectOption('zoneDetectionModelIdList', currentModelId)
      }
    })
    .finally(() => {
      toggleLoader(true)
    })
})

$('#zoneDetectionModelIdList').on('change', async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const deviceListId = 'zoneDetectionDeviceIdList'
  const modelListId = evt.target.id
  const deviceList = document.getElementById(deviceListId)
  const modelList = document.getElementById(modelListId)
  currentModelId = modelList[modelList.selectedIndex].value

  // enable start buttons only when a device is online.
  if (deviceList.selectedIndex > 0 && modelList.selectedIndex > 0) {
    const isDisconnected = (deviceList[deviceList.selectedIndex].getAttribute('data-isDisconnected') === 'true')
    $('#startZoneDetectionWithImageBtn').prop('disabled', isDisconnected)
    $('#startZoneDetectionBtn').prop('disabled', isDisconnected)
  }
})

$('#pplModeSelector').on('change', async function (evt) {
  pplMode = parseInt(evt.target.value)
})

// //////////////////////////////////////////////////////////////
// Button Clicks
// //////////////////////////////////////////////////////////////

// Refresh Device List for Setup 1 -> Step 1 : Capture Image
$('#captureDeviceIdListRefreshBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const resultElementId = 'captureImageBtnResult'

  toggleLoader(false)
  // remember current selection
  const selectedVal = $('#captureDeviceIdList option:selected').val()

  GetDevices('captureDeviceIdList', true, false, 'Select Device', '0', resultElementId)
    .then(() => {
    })
    .catch(() => {
    })
    .finally(() => {
      if (selectedVal != null && selectedVal.length > 0) {
        console.debug(selectedVal)
        $('select[name="captureDeviceIdList"]').val(selectedVal)
      }
      toggleLoader(true)
    })
})

// Capture an image.
$('#captureImageBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const resultElementId = 'captureImageBtnResult'
  toggleLoader(false)

  // Clear the canvas
  ClearCaptureCanvas()
  CaptureImage(resultElementId)
    .then(() => {
      getCapturedImage()
    })
    .finally(() => {
      toggleLoader(true)
    })
})

// Start inference on capture image
$('#captureStartInferenceBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)

  StartInference('captureStartInferenceBtnResult')
    .then(() => { })
    .finally(() => {
      // disable UI elements, but enabled stop button
      disableUiElements(true)
      lastUpdateTime = new Date()
      startTimer()
      $('#captureStopInferenceBtn').prop('disabled', false)
      toggleLoader(true)
    })
})

// Stop inference on capture image
$('#captureStopInferenceBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)
  stopTimer()
  StopInference('captureStartInferenceBtnResult')
    .then(() => { })
    .finally(() => {
      // enable UI elements, but disable stop button
      disableUiElements(false)
      $('#captureStopInferenceBtn').prop('disabled', true)
      toggleLoader(true)
    })
})

// Save parameters to cookie
$('#captureSaveParameterBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)
  SaveParameter()
    .then(() => { })
    .finally(() => {
      toggleLoader(true)
    })
})

// Refresh device list in Zone Detection Tab
$('#zoneDetectionDeviceIdListRefreshBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  const resultElementId = 'startZoneDetectionBtnResult'

  toggleLoader(false)
  const selectedVal = $('#captureDeviceIdList option:selected').val()

  GetDevices('zoneDetectionDeviceIdList', true, false, 'Select Device', '0', resultElementId)
    .then(() => {
    })
    .catch(() => {
    })
    .finally(() => {
      if (selectedVal != null && selectedVal.length > 0) {
        console.debug(selectedVal)
        $('select[name="captureDeviceIdList"]').val(selectedVal)
      }
      toggleLoader(true)
    })
})

// Start Inference on Zone Detection (Telemetry/Events tab)
$('#startZoneDetectionBtn').click(async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)

  // set attribute so we know which API to use to stop inference
  document.getElementById('stopZoneDetectionBtn').setAttribute('data-withImage', false)

  // No image
  await StartZoneDetection('startZoneDetectionBtnResult', false)
    .then((bStarted) => {
      if (bStarted) {
        isZoneDetectionRunning = true
        disableUiElements(true)
        $('#stopZoneDetectionBtn').prop('disabled', false)
      }
    })
    .finally(() => {
      toggleLoader(true)
    })
})

// Start Inference with image on Zone Detection (Telemetry/Events tab)
$('#startZoneDetectionWithImageBtn').click(async function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)

  // set attribute so we know which API to use to stop inference
  document.getElementById('stopZoneDetectionBtn').setAttribute('data-withImage', true)

  // With Image
  await StartZoneDetection('startZoneDetectionBtnResult', true)
    .then((bStarted) => {
      if (bStarted) {
        isZoneDetectionRunning = true
        disableUiElements(true)
        $('#stopZoneDetectionBtn').prop('disabled', false)
      }
    })
    .finally(() => {
      toggleLoader(true)
    })
})

// Stop inference
$('#stopZoneDetectionBtn').click(function (evt) {
  // console.debug(evt.target.id + '() ' + evt.type)
  toggleLoader(false)

  console.debug(`With Image ${document.getElementById('stopZoneDetectionBtn').getAttribute('data-withImage')}`)

  // Clear blink on the background if it is set.
  const chartDiv = document.getElementById('barChartDiv')
  if (chartDiv.classList.contains('alertBlink') === true) {
    chartDiv.classList.remove('alertBlink')
  }

  StopInference('startZoneDetectionBtnResult')
    .then(() => { })
    .finally(() => {
      disableUiElements(false)
      $('#stopZoneDetectionBtn').prop('disabled', true)
      toggleLoader(true)
      isZoneDetectionRunning = false
    })
})
