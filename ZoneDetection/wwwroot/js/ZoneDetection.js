/*
 * Copyright (c) 2023, 2024 Sony Semiconductor Solutions Corporation
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
/* eslint-disable no-caller */
/* eslint-disable no-undef */
//
// Canvas
//
let captureOvelayCanvas
let captureOverlayCanvasCtx
let captureCanvas
let captureCanvasCtx
let captureCanvasZoneOverlay
let captureCanvasZoneOverlayCtx

let captureOverlayCanvasOffsetX
let captureOverlayCanvasOffsetY

const handleSize = 8
let currentHandle = false
let isResize = false
let isMouseDown = false
let pendingImagePath = ''
let iouStart = null
const retryCount = 10

let captureRatio = 2// For capture canvas, draw image bigger (640x640 vs. 320x320).
// 320x320 is too small to draw rectangle (or zone) and read letters

const region = {
  x: 0,
  y: 0,
  w: 0,
  h: 0
}

// Utility functions for drawing zone
function point (x, y) {
  return {
    x,
    y
  }
}

function dist (p1, p2) {
  return Math.sqrt((p2.x - p1.x) * (p2.x - p1.x) + (p2.y - p1.y) * (p2.y - p1.y))
}

// parse yyyymmddhhmmssSSS format to Date object
function getDate (dateString) {
  const date = new Date(Date.UTC(dateString.substr(0, 4), dateString.substr(4, 2), dateString.substr(6, 2), dateString.substr(8, 2), dateString.substr(10, 2), dateString.substr(12, 2), dateString.substr(14, 3)))
  return date
}

// Utility function to print time in cosole to see timings.
function printTime (msg) {
  const dateObj = new Date()
  let hour = dateObj.getHours()
  hour = ('0' + hour).slice(-2)
  let min = dateObj.getMinutes()
  min = ('0' + min).slice(-2)
  let sec = dateObj.getSeconds()
  sec = ('0' + sec).slice(-2)
  console.debug(`${msg} : ${hour}:${min}:${sec}`)
}

// enable/disable mouse events for the top most canvas
function enableDisableMouseEvent (bEnable) {
  if (bEnable) {
    captureOvelayCanvas.addEventListener('mousedown', mouseDown, false)
    captureOvelayCanvas.addEventListener('mouseup', mouseUp, false)
    captureOvelayCanvas.addEventListener('mousemove', mouseMove, false)
  } else {
    captureOvelayCanvas.removeEventListener('mousedown', mouseDown, false)
    captureOvelayCanvas.removeEventListener('mouseup', mouseUp, false)
    captureOvelayCanvas.removeEventListener('mousemove', mouseMove, false)
  }
}

// Utility function to disable/enable UI elements
function disableUiElements (bDisable) {
  $('#captureImageBtn').prop('disabled', bDisable)
  $('#captureStartInferenceBtn').prop('disabled', bDisable)
  $('#captureStopInferenceBtn').prop('disabled', bDisable)
  $('#captureFrequencySlider').prop('disabled', bDisable)
  $('#zoneDetectionFrequencySlider').prop('disabled', bDisable)
  $('#startZoneDetectionBtn').prop('disabled', bDisable)
  $('#startZoneDetectionWithImageBtn').prop('disabled', bDisable)
  $('#stopZoneDetectionBtn').prop('disabled', bDisable)
}

// Display an overlay to show message on capture canvas
function toggleCanvasLoader (bForceClear) {
  if (isZoneDetectionRunning === true) {
    canvasId = 'zoneDetectionCanvasLoaderWrapper'
  } else {
    canvasId = 'captureImageCanvasLoaderWrapper'
  }

  const loader = document.getElementById(canvasId)

  if (bForceClear) {
    loader.style.display = 'none'
  } else {
    if (loader.style.display === 'none') {
      loader.style.display = 'block'
    } else {
      loader.style.display = 'none'
    }
  }
}

// Initialize capture canvas and draw zone rect
function initCaptureCanvas (canvasIdZoneOverlay, canvasIdOverlay, canvasIdImage) {
  captureCanvas = document.getElementById(canvasIdImage)
  captureCanvasCtx = captureCanvas.getContext('2d')
  captureOvelayCanvas = document.getElementById(canvasIdOverlay)
  captureOverlayCanvasCtx = captureOvelayCanvas.getContext('2d')
  captureOverlayCanvasCtx.strokeStyle = 'yellow'
  captureOverlayCanvasCtx.lineWidth = 1
  captureOverlayCanvasCtx.globalCompositeOperation = 'destination-over'

  captureCanvasZoneOverlay = document.getElementById(canvasIdZoneOverlay)
  captureCanvasZoneOverlayCtx = captureCanvasZoneOverlay.getContext('2d')
  captureCanvasZoneOverlayCtx.strokeStyle = 'red'
  captureCanvasZoneOverlayCtx.lineWidth = 3
}

// Display an image in Capture Canvas.
async function SetCaptureCanvas (capturePhotoUrl, rectZone) {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)
  let found = false
  let imagePath
  toggleCanvasLoader(false)
  try {
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'ZoneDetection/GetImageFromBlob',
      data: {
        imageSearch: capturePhotoUrl
      }
    }).done(function (response) {
      const json = JSON.parse(response.value)
      imagePath = json.uri
      found = true
    }).fail(function (response, status, err) {
      console.error(`ZoneDetection/GetImageFromBlob : error : ${err}`)
      imagePath = '/images/imagenotfoundinblob.jpg'
    }).always(function (response, status, err) {
      canvasId = 'captureImageCanvas'
      overlayCanvsId = 'captureImageCanvasOverlay'

      const canvasImage = document.getElementById(canvasId)
      const canvasImageCtx = canvasImage.getContext('2d')

      const img = new Image()
      img.src = imagePath
      img.onload = function () {
        canvasImageCtx.clearRect(0, 0, canvasImage.width, canvasImage.height)
        canvasImageCtx.globalCompositeOperation = 'source-over'
        canvasImageCtx.drawImage(img, 0, 0, canvasImage.width, canvasImage.height)

        if (found) {
          captureRatio = captureCanvasZoneOverlay.width / img.width

          captureCanvasZoneOverlayCtx.clearRect(0, 0, captureCanvasZoneOverlay.width, captureCanvasZoneOverlay.height)
          captureCanvasZoneOverlayCtx.fillStyle = 'red'
          captureCanvasZoneOverlayCtx.strokeRect(rectZone[0] * captureRatio, rectZone[1] * captureRatio, (rectZone[2] - rectZone[0]) * captureRatio, (rectZone[3] - rectZone[1]) * captureRatio)
          captureCanvasZoneOverlayCtx.globalAlpha = 0.3
          captureCanvasZoneOverlayCtx.fillRect(rectZone[0] * captureRatio, rectZone[1] * captureRatio, (rectZone[2] - rectZone[0]) * captureRatio, (rectZone[3] - rectZone[1]) * captureRatio)
        }
      }
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
  } finally {
    toggleCanvasLoader(true)
  }
}

// clear capture canvas.
function ClearCaptureCanvas () {
  // clear all layers
  captureCanvasCtx.clearRect(0, 0, captureCanvas.width, captureCanvas.height)
  captureOverlayCanvasCtx.clearRect(0, 0, captureOvelayCanvas.width, captureOvelayCanvas.height)
  captureCanvasZoneOverlayCtx.clearRect(0, 0, captureCanvasZoneOverlay.width, captureCanvasZoneOverlay.height)

  // draw gray background
  captureCanvasCtx.rect(0, 0, captureCanvas.width, captureCanvas.height)
  captureCanvasCtx.fillStyle = 'lightgray'
  captureCanvasCtx.fill()
}

// Clear Zone Detection canvas
function ClearZoneDetectionCanvas () {
  // clear all layers
  let canvas = document.getElementById('zoneDetectionCanvasOverlay')
  let canvasCtx = canvas.getContext('2d')
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  canvas = document.getElementById('zoneDetectionCanvasZoneOverlay')
  canvasCtx = canvas.getContext('2d')
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  canvas = document.getElementById('zoneDetectionCanvas')
  canvasCtx = canvas.getContext('2d')
  canvasCtx.clearRect(0, 0, canvas.width, canvas.height)

  // draw gray background
  canvasCtx.rect(0, 0, captureCanvas.width, captureCanvas.height)
  canvasCtx.fillStyle = 'lightgray'
  canvasCtx.fill()
}

// returns mouse position
function getHandle (mouse) {
  if (dist(mouse, point(region.x, region.y)) <= handleSize) return 'topleft'
  if (dist(mouse, point(region.x + region.w, region.y)) <= handleSize) return 'topright'
  if (dist(mouse, point(region.x, region.y + region.h)) <= handleSize) return 'bottomleft'
  if (dist(mouse, point(region.x + region.w, region.y + region.h)) <= handleSize) return 'bottomright'
  if (dist(mouse, point(region.x + region.w / 2, region.y)) <= handleSize) return 'top'
  if (dist(mouse, point(region.x, region.y + region.h / 2)) <= handleSize) return 'left'
  if (dist(mouse, point(region.x + region.w / 2, region.y + region.h)) <= handleSize) return 'bottom'
  if (dist(mouse, point(region.x + region.w, region.y + region.h / 2)) <= handleSize) return 'right'
  return false
}

// //////////////////////////////////////////////////////////////
// Event handlers for mouse move
// //////////////////////////////////////////////////////////////

// Process mouse down (Press and hold)
function mouseDown (e) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)

  e.preventDefault()
  e.stopPropagation()

  currentHandle = getHandle(point(e.pageX - captureOverlayCanvasOffsetX, e.pageY - captureOverlayCanvasOffsetY))

  if (currentHandle === false) {
    // Clicked not on region's line.
    // Start a new region
    const $canvas = $('#captureImageCanvasZoneOverlay')
    const canvasOffset = $canvas.offset()
    currentHandle = 'bottomright'
    captureOverlayCanvasOffsetX = canvasOffset.left
    captureOverlayCanvasOffsetY = canvasOffset.top
    region.x = parseInt(e.pageX - captureOverlayCanvasOffsetX)
    region.y = parseInt(e.pageY - captureOverlayCanvasOffsetY)
    isMouseDown = true
    isResize = false
    captureCanvasZoneOverlayCtx.strokeStyle = 'red'
  } else {
    // Clicked on a corner or on line
    isResize = true
    drawZoneRectangle()
  }
}

// Process mouse button release
function mouseUp (e) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)
  e.preventDefault()
  e.stopPropagation()

  isResize = false
  isMouseDown = false

  currentHandle = false
  if (region.w < 0) {
    region.x = region.x + region.w
    region.w = Math.abs(region.w)
  }

  if (region.h < 0) {
    region.y = region.y + region.h
    region.h = Math.abs(region.h)
  }

  const x = parseInt(region.x / captureRatio).toString()
  const y = parseInt(region.y / captureRatio).toString()

  $('#region_x').html(x.padStart(3, ' '))
  $('#region_y').html(y.padStart(3, ' '))

  const w = parseInt((region.x + region.w) / captureRatio).toString()
  const h = parseInt((region.y + region.h) / captureRatio).toString()

  $('#region_w').html(w.padStart(3, ' '))
  $('#region_h').html(h.padStart(3, ' '))

  rectZone[0] = x
  rectZone[1] = y
  rectZone[2] = w
  rectZone[3] = h

  drawZoneRectangle()

  captureCanvasZoneOverlayCtx.globalAlpha = 0.3
  captureCanvasZoneOverlayCtx.fillStyle = 'red'
  captureCanvasZoneOverlayCtx.fillRect(region.x, region.y, region.w, region.h)
}

// Process mouse pointer move
function mouseMove (e) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)

  e.preventDefault()
  e.stopPropagation()

  if (isMouseDown) {
    // draw region (not resize)
    const mouseX = parseInt(e.pageX - captureOverlayCanvasOffsetX)
    const mouseY = parseInt(e.pageY - captureOverlayCanvasOffsetY)

    region.w = mouseX - region.x
    region.h = mouseY - region.y

    captureCanvasZoneOverlayCtx.clearRect(0, 0, captureCanvasZoneOverlay.width, captureCanvasZoneOverlay.height)
    drawZoneRectangle()
  } else if (isResize) {
    const mousePos = point(e.pageX - captureOverlayCanvasOffsetX, e.pageY - captureOverlayCanvasOffsetY)
    switch (currentHandle) {
      case 'topleft':
        region.w += parseInt(region.x - mousePos.x)
        region.h += parseInt(region.y - mousePos.y)
        region.x = mousePos.x
        region.y = mousePos.y
        break
      case 'topright':
        region.w = parseInt(mousePos.x - region.x)
        region.h += parseInt(region.y - mousePos.y)
        region.y = mousePos.y
        break
      case 'bottomleft':
        region.w += parseInt(region.x - mousePos.x)
        region.h = parseInt(mousePos.y - region.y)
        region.x = mousePos.x
        break
      case 'bottomright':
        region.w = parseInt(mousePos.x - region.x)
        region.h = parseInt(mousePos.y - region.y)
        break

      case 'top':
        region.h += parseInt(region.y - mousePos.y)
        region.y = mousePos.y
        break

      case 'left':
        region.w += parseInt(region.x - mousePos.x)
        region.x = mousePos.x
        break

      case 'bottom':
        region.h = parseInt(mousePos.y - region.y)
        break

      case 'right':
        region.w = parseInt(mousePos.x - region.x)
        break
    }

    drawZoneRectangle()
  }
}

// Draw rectangle.  For capture canvas.
function drawZoneRectangle () {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)

  captureCanvasZoneOverlayCtx.strokeStyle = 'red'
  captureCanvasZoneOverlayCtx.globalAlpha = 1

  if (currentHandle === false) {
    // mouse pointer not on a corner or on line.  Clear region
    captureCanvasZoneOverlayCtx.clearRect(0, 0, captureCanvasZoneOverlay.width, captureCanvasZoneOverlay.height)
    captureCanvasZoneOverlayCtx.strokeRect(region.x, region.y, region.w, region.h)
  } else {
    captureCanvasZoneOverlayCtx.clearRect(0, 0, captureCanvasZoneOverlay.width, captureCanvasZoneOverlay.height)
    captureCanvasZoneOverlayCtx.strokeRect(region.x, region.y, region.w, region.h)

    const posHandle = point(0, 0)
    switch (currentHandle) {
      case 'topleft':
        posHandle.x = region.x
        posHandle.y = region.y
        break
      case 'topright':
        posHandle.x = region.x + region.w
        posHandle.y = region.y
        break
      case 'bottomleft':
        posHandle.x = region.x
        posHandle.y = region.y + region.h
        break
      case 'bottomright':
        posHandle.x = region.x + region.w
        posHandle.y = region.y + region.h
        break
      case 'top':
        posHandle.x = region.x + region.w / 2
        posHandle.y = region.y
        break
      case 'left':
        posHandle.x = region.x
        posHandle.y = region.y + region.h / 2
        break
      case 'bottom':
        posHandle.x = region.x + region.w / 2
        posHandle.y = region.y + region.h
        break
      case 'right':
        posHandle.x = region.x + region.w
        posHandle.y = region.y + region.h / 2
        break
    }
    captureCanvasZoneOverlayCtx.globalCompositeOperation = 'xor'
    captureCanvasZoneOverlayCtx.beginPath()
    captureCanvasZoneOverlayCtx.arc(posHandle.x, posHandle.y, handleSize, 0, 2 * Math.PI)
    captureCanvasZoneOverlayCtx.fillStyle = 'white'
    captureCanvasZoneOverlayCtx.fill()
    captureCanvasZoneOverlayCtx.stroke()
    captureCanvasZoneOverlayCtx.globalCompositeOperation = 'source-over'
  }
}

async function SetFromCommandParameterToDOM () {
  const resultCommandParam = await GetCommandParameterFile()
  const applyCheckDeviceId = resultCommandParam.parameter_list.filter(elm => elm.device_ids.indexOf(currentDeviceId) !== -1)

  if (applyCheckDeviceId.length === 0) {
    return false
  } else {
    const param = applyCheckDeviceId[0].parameter.commands[0].parameters
    if (param.ModelId !== undefined) {
      currentModelId = param.ModelId
    }

    if (param.PPLParameter.zone !== undefined) {
      rectZone[0] = param.PPLParameter.zone.top_left_x
      rectZone[1] = param.PPLParameter.zone.top_left_y
      rectZone[2] = param.PPLParameter.zone.bottom_right_x
      rectZone[3] = param.PPLParameter.zone.bottom_right_y
    }

    if (param.PPLParameter.threshold !== undefined) {
      if (typeof param.PPLParameter.threshold === 'object') {
        captureThresholdSlider.value = param.PPLParameter.threshold.score * 100
        captureThresholdSliderLabel.innerHTML = param.PPLParameter.threshold.score * 100
        zoneDetectionThresholdSlider.value = param.PPLParameter.threshold.score * 100
        currentThreshold = param.PPLParameter.threshold.score

        captureIoUThresholdSlider.value = param.PPLParameter.threshold.iou * 100
        captureIoUThresholdSliderLabel.innerHTML = param.PPLParameter.threshold.iou * 100
        zoneDetectionIoUThresholdSlider.value = param.PPLParameter.threshold.iou * 100
        currentIoUThreshold = param.PPLParameter.threshold.iou
      } else {
        captureThresholdSlider.value = param.PPLParameter.threshold * 100
        captureThresholdSliderLabel.innerHTML = param.PPLParameter.threshold * 100
        zoneDetectionThresholdSlider.value = param.PPLParameter.threshold * 100
        currentThreshold = param.PPLParameter.threshold
      }
    }
    if (param.UploadInterval !== undefined && param.UploadInterval !== 1) {
      const freq = (param.UploadInterval / 1000) * 33.3
      const convertedFreq = Math.round(freq * 10) / 10
      captureFrequencySlider.value = convertedFreq
      captureFrequencySliderLabel.innerHTML = convertedFreq
      zoneDetectionFrequencySlider.value = convertedFreq
      zoneDetectionFrequencyLabel.innerHTML = convertedFreq
    } else if (param.UploadInterval !== undefined && param.UploadInterval === 1) {
      captureFrequencySlider.value = 0
      captureFrequencySliderLabel.innerHTML = 0
      zoneDetectionFrequencySlider.value = 0
      zoneDetectionFrequencyLabel.innerHTML = 0
    }
    return true
  }
}

async function GetCommandParameterFile () {
  let result
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'sony/GetCommadParameterFile',
      data: {
        token
      }
    }).done(function (response) {
      result = JSON.parse(response.value)
    }).fail(function (response, status, err) {
      console.error(`sony/GetCommadParameterFile : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    throw err
  }
  return result
}

async function RegistCommandParameterFile (fileName, comment, commandName, mode,
  uploadMethod, fileFormat, uploadMethodIR, cropHOffset,
  cropVOffset, cropHSize, cropVSize, numberOfImages,
  uploadInterval, numberOfInferencesPerMessage,
  maxDetectionsPerFrame, storageSubDirectoryPath,
  storageSubDirectoryPathIR, pplParameter, modelId) {
  let result
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'POST',
      url: window.location.origin + '/' + 'sony/RegistCommandParameterFile',
      data: {
        token,
        fileName,
        comment,
        commandName,
        mode,
        uploadMethod,
        fileFormat,
        uploadMethodIR,
        cropHOffset,
        cropVOffset,
        cropHSize,
        cropVSize,
        numberOfImages,
        uploadInterval,
        numberOfInferencesPerMessage,
        maxDetectionsPerFrame,
        storageSubDirectoryPath,
        storageSubDirectoryPathIR,
        pplParameter: pplParameter === null ? null : JSON.stringify(pplParameter),
        modelId
      }
    }).done(function (response) {
      console.debug(response.value)
      result = JSON.parse(response.value)
    }).fail(function (response, status, err) {
      console.error(`sony/RegistCommandParameterFile : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    throw err
  }
  return result
}

async function ApplyCommandParameterFileToDevice (deviceId, fileName) {
  let result
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'PUT',
      url: window.location.origin + '/' + 'sony/ApplyCommandParameterFileToDevice',
      data: {
        token,
        deviceId,
        fileName
      }
    }).done(function (response) {
      console.debug(response.value)
      result = JSON.parse(response.value)
    }).fail(function (response, status, err) {
      console.error(`sony/ApplyCommandParameterFileToDevice : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    throw err
  }
  return result
}

async function UnBindCommandParameterFileToDevice (deviceId, fileName) {
  let result
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'DELETE',
      url: window.location.origin + '/' + 'sony/UnBindCommandParameterFileToDevice',
      data: {
        token,
        deviceId,
        fileName
      }
    }).done(function (response) {
      console.debug(response.value)
      result = JSON.parse(response.value)
    }).fail(function (response, status, err) {
      console.error(`sony/UnBindCommandParameterFileToDevice : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    throw err
  }
  return result
}

async function UpdateCommandParameterFile (fileName, comment, commandName, mode, uploadMethod,
  fileFormat, uploadMethodIR, cropHOffset, cropVOffset, cropHSize,
  cropVSize, numberOfImages, uploadInterval, numberOfInferencesPerMessage,
  maxDetectionsPerFrame, storageSubDirectoryPath, storageSubDirectoryPathIR,
  pplParameter, modelId) {
  let result
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'PATCH',
      url: window.location.origin + '/' + 'sony/UpdateCommandParameterFile',
      data: {
        token,
        fileName,
        comment,
        commandName,
        mode,
        uploadMethod,
        fileFormat,
        uploadMethodIR,
        cropHOffset,
        cropVOffset,
        cropHSize,
        cropVSize,
        numberOfImages,
        uploadInterval,
        numberOfInferencesPerMessage,
        maxDetectionsPerFrame,
        storageSubDirectoryPath,
        storageSubDirectoryPathIR,
        pplParameter: pplParameter === null ? null : JSON.stringify(pplParameter),
        modelId
      }
    }).done(function (response) {
      console.debug(response.value)
      result = JSON.parse(response.value)
    }).fail(function (response, status, err) {
      console.error(`sony/UpdateCommandParameterFile : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    throw err
  }
  return result
}

async function ManagementCommandParameter (deviceId, fileName, comment, commandName, mode, uploadMethod,
  fileFormat, uploadMethodIR, cropHOffset, cropVOffset, cropHSize,
  cropVSize, numberOfImages, uploadInterval, numberOfInferencePerMessage,
  maxDetectionsPerFrame, storageSubDirectoryPath, storageSubDirectoryPathIR,
  pplParameter, modelId) {
  try {
    const commandParamName = `${fileName}_${deviceId}.json`
    const resultCommandParam = await GetCommandParameterFile()
    const parameterInfo = resultCommandParam.parameter_list.filter(elm => elm.file_name === commandParamName)
    const applyCheckDeviceId = resultCommandParam.parameter_list.filter(elm => elm.device_ids.indexOf(currentDeviceId) !== -1)
    if (applyCheckDeviceId.length !== 0 && applyCheckDeviceId[0].file_name !== commandParamName) {
      await UnBindCommandParameterFileToDevice(deviceId, applyCheckDeviceId[0].file_name)
    }

    if (parameterInfo.length === 0) {
      await RegistCommandParameterFile(commandParamName, comment, commandName, mode, uploadMethod,
        fileFormat, uploadMethodIR, cropHOffset, cropVOffset, cropHSize,
        cropVSize, numberOfImages, uploadInterval, numberOfInferencePerMessage,
        maxDetectionsPerFrame, storageSubDirectoryPath, storageSubDirectoryPathIR,
        pplParameter, modelId)
      await ApplyCommandParameterFileToDevice(deviceId, commandParamName)
    } else if (applyCheckDeviceId.length === 0 || (applyCheckDeviceId.length !== 0 && applyCheckDeviceId[0].file_name !== commandParamName)) {
      await ApplyCommandParameterFileToDevice(deviceId, commandParamName)
      await UpdateCommandParameterFile(commandParamName, comment, commandName, mode, uploadMethod,
        fileFormat, uploadMethodIR, cropHOffset, cropVOffset,
        cropHSize, cropVSize, numberOfImages, uploadInterval,
        numberOfInferencePerMessage, maxDetectionsPerFrame,
        storageSubDirectoryPath, storageSubDirectoryPathIR,
        pplParameter, modelId)
    } else if (applyCheckDeviceId[0].file_name === commandParamName) {
      await UpdateCommandParameterFile(commandParamName, comment, commandName, mode, uploadMethod,
        fileFormat, uploadMethodIR, cropHOffset, cropVOffset,
        cropHSize, cropVSize, numberOfImages, uploadInterval,
        numberOfInferencePerMessage, maxDetectionsPerFrame,
        storageSubDirectoryPath, storageSubDirectoryPathIR,
        pplParameter, modelId)
    }
  } catch (err) {
    console.log('ManagementCommandParameter:' + err)
    throw err
  }
}

// Start image capture
async function CaptureImage (resultElementId) {
  const funcName = `${arguments.callee.name}()`
  printTime(`=> ${funcName}`)
  let resultElement = null

  try {
    if (checkTokenExp(token)) await getToken()
    pendingImagePath = ''

    if (resultElementId != null) {
      resultElement = document.getElementById(resultElementId)
    }

    setResultElement(resultElement, `Capturing image from ${currentDeviceId}`)
    await ManagementCommandParameter(currentDeviceId, COMMAND_PARAM_FILE_NAME, null, 'StartUploadInferenceData',
      0, null, null, null, null, null, null, null,
      '1', null, null, null, null, null, null, currentModelId)

    await $.ajax({
      async: true,
      type: 'POST',
      url: window.location.origin + '/' + 'sony/StartUploadInferenceResult',
      data: {
        token,
        deviceId: currentDeviceId
      }
    }).done(function (response) {
      const result = JSON.parse(response.value)

      if (result.result === 'SUCCESS') {
        toggleCanvasLoader(false)
        pendingImagePath = result.outputSubDirectory
        setResultElement(resultElement, `Waiting for an image at ${result.outputSubDirectory.split('/')[3]}`)
      }
    })
  } catch (err) {
    console.error(`${funcName}: ${err.responseJSON.value}`)
    setResultElement(resultElement, err.responseJSON.value)
  }
  return pendingImagePath
}

// process Telemetry SignalR message to update chart
async function telemetryEventsProcessMessage (signalRMsg, barChart, threshold, iouThreshold, notificationThreshold) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)
  try {
    const message = JSON.parse(signalRMsg)

    if (message == null) {
      // no data, just return
      return
    }
    // Apply Edge Device id filter.
    if (message.deviceId !== currentDeviceId) {
      return
    }
    const inference = JSON.parse(message.data)

    const subDir = pendingImagePath.split('/')[3]
    if (inference.T < subDir) {
      console.log('Receives old inference result and terminates processing')
      return
    }
    if (withImage) {
      telemetryEventsGenerateImagePath(signalRMsg, threshold, iouThreshold)
    }

    barChart.data.labels.push(message.eventTime)

    let pValue = 0
    let canvasOverlay
    let ctxOverlay
    if (withImage === false) {
      // Inference in progress without image (inference results only)
      // Draw bounding box
      canvasOverlay = document.getElementById('zoneDetectionCanvasOverlay')
      ctxOverlay = canvasOverlay.getContext('2d')
      ctxOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height)
      const canvasImg = document.getElementById('zoneDetectionCanvas')
      const canvasImgCtx = canvasImg.getContext('2d')
      canvasImgCtx.clearRect(0, 0, canvasImg.width, canvasImg.height)
    }

    for (let i = 0; i < inference.inferenceResults.length; i++) {
      const inferenceResults = inference.inferenceResults
      // DrawingBoundingBox process in no-image mode
      if (withImage === false) {
        if (pplMode === 0 && inferenceResults[i].P >= threshold) {
          DrawBoundingBox(inferenceResults[i], canvasOverlay, threshold, 1, 1)
        } else if (inferenceResults[i].P >= threshold && inferenceResults[i].iou >= iouThreshold) {
          DrawBoundingBox(inferenceResults[i], canvasOverlay, threshold, 1, 1)
        }
      }

      if (inferenceResults[i].P >= threshold && inferenceResults[i].Zoneflag) {
        if (iouStart == null) {
          iouStart = getDate(inference.T)
        } else {
          const dateNow = getDate(inference.T)
          const delta = Math.abs(dateNow - iouStart)

          if ((delta / 1000) >= notificationThreshold) {
            const chartDiv = document.getElementById('barChartDiv')

            if (chartDiv.classList.contains('alertBlink') === false) {
              chartDiv.classList.add('alertBlink')
              const navbarNotificationSpan = document.getElementById('navbarNotificationSpan')
              const navbarAlertHeader = document.getElementById('navbarAlertHeader')
              const navbarAlertSpan = document.getElementById('navbarAlertSpan')

              let currentValue = 0

              if (navbarNotificationSpan.innerHTML.length > 0) {
                currentValue = parseInt(navbarNotificationSpan.innerHTML)
              }
              currentValue += 1
              navbarNotificationSpan.innerHTML = currentValue
              navbarAlertHeader.innerHTML = `${currentValue} alert`

              navbarAlertSpan.innerHTML = `${dateNow.toLocaleString('en-US')}`
            }
          }
        }
        pValue++
      }
    }

    if (pValue === 0) {
      const chartDiv = document.getElementById('barChartDiv')
      if (chartDiv.classList.contains('alertBlink') === true) {
        chartDiv.classList.remove('alertBlink')
      }
      iouStart = null
    }
    barChart.data.datasets[0].data.push(pValue)
    barChart.update()
  } catch (err) {
    console.error('Error processing Telemetry data for chart ')
  }
}

async function testDetectionProcessMessage (signalRMsg, threshold, iouThreshold, testDetectionFlg) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)
  if (!testDetectionFlg) {
    return
  }

  if (pendingImagePath.length === 0) {
    // Images are not captured, inference results only.  Nothing to do.
    return
  }

  const imagePath = pendingImagePath.split('/')

  if (imagePath.length !== 4) {
    return
  }

  try {
    const message = JSON.parse(signalRMsg)

    if (message.deviceId !== currentDeviceId) {
      return
    }
    const inference = JSON.parse(message.data)

    const imageUrl = `${imagePath[1]}/${imagePath[2]}/${imagePath[3]}/${inference.T}.jpg`
    await testDetectionDrawingToCanvas(imageUrl, inference.inferenceResults, threshold, iouThreshold, retryCount)
  } catch (err) {
    console.error(`testDetectionProcessMessage: ${err.statusText}`)
  }
}

async function telemetryEventsGenerateImagePath (signalRMsg, threshold, iouThreshold) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)

  if (pendingImagePath.length === 0) {
    // Images are not captured, inference results only.  Nothing to do.
    return
  }

  const imagePath = pendingImagePath.split('/')

  if (imagePath.length !== 4) {
    return
  }

  try {
    const message = JSON.parse(signalRMsg)

    if (message.deviceId !== currentDeviceId) {
      return
    }

    const inference = JSON.parse(message.data)
    const imageUrl = `${imagePath[1]}/${imagePath[2]}/${imagePath[3]}/${inference.T}.jpg`
    await telemetryEventsDrawingToCanvas(imageUrl, inference.inferenceResults, threshold, iouThreshold, retryCount)
  } catch (err) {
    console.error(`telemetryEventsGenerateImagePath: ${err.statusText}`)
  }
}

async function getCapturedImage () {
  if (pendingImagePath.length === 0) {
    return
  }

  const pendingImagePathArr = pendingImagePath.split('/')
  const dir = pendingImagePathArr[3]
  getLatestImage(dir, retryCount)
}

async function getLatestImage (dir, count) {
  const funcName = `${arguments.callee.name}()`
  try {
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'ZoneDetection/GetImageFromBlob',
      data: {
        imageSearch: dir
      }
    }).done(async function (response) {
      console.debug(response.value)
      const json = JSON.parse(response.value)
      if (json.uri.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (count === 0) throw new Error('End of retry process')
        return await getLatestImage(dir, count - 1)
      } else {
        const captureOvelayCanvas = document.getElementById('captureImageCanvas')
        const captureOverlayCanvasCtx = captureOvelayCanvas.getContext('2d')
        const img = new Image()
        img.src = json.uri
        img.onload = function () {
          captureOverlayCanvasCtx.drawImage(img, 0, 0, captureOvelayCanvas.width, captureOvelayCanvas.height)
          toggleCanvasLoader(true)

          let imagePathArr = json.uri.split('/')
          imagePathArr = imagePathArr.slice(4, imagePathArr.length)
          const queryIndex = imagePathArr[3].indexOf('?')
          imagePathArr[3] = imagePathArr[3].substr(0, queryIndex)
          const path = imagePathArr.join('/')
          capturePhotoUrl = path
          StopInference('captureImageBtnResult')
        }
      }
    }).fail(function (response, status, err) {
      console.error(`ZoneDetection/GetImageFromBlob : error : ${err}`)
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    if (count === 0) throw err
    return await getLatestImage(dir, count - 1)
  }
}

// Checks image in Blob Storage and display it.
async function testDetectionDrawingToCanvas (imagePath, inferenceResults, threshold, iouThreshold, count) {
  // need to clear spinner on exit
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)
  let found = false

  try {
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'ZoneDetection/GetImageFromBlob',
      data: {
        imageSearch: imagePath
      }
    }).done(async function (response) {
      const json = JSON.parse(response.value)
      if (json.uri.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (count === 0) throw new Error('End of retry process')
        return await testDetectionDrawingToCanvas(imagePath, inferenceResults, threshold, iouThreshold, count - 1)
      } else {
        console.debug(response.value)
        const canvasId = 'captureImageCanvas'
        const overlayCanvsId = 'captureImageCanvasOverlay'
        const canvasImage = document.getElementById(canvasId)
        const ctxImage = canvasImage.getContext('2d')
        const canvasOverlay = document.getElementById(overlayCanvsId)
        const ctxOverlay = canvasOverlay.getContext('2d')
        const img = new Image()
        img.src = json.uri
        img.onload = function () {
          ctxOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height)
          ctxImage.clearRect(0, 0, canvasImage.width, canvasImage.height)
          ctxImage.globalCompositeOperation = 'source-over'
          ctxImage.drawImage(img, 0, 0, canvasImage.width, canvasImage.height)

          const ratioX = canvasImage.width / img.width
          const ratioY = canvasImage.height / img.height

          if (inferenceResults != null) {
            for (let i = 0; i < inferenceResults.length; i++) {
              const data = inferenceResults[i]

              // Draw a bounding box if P is above threshold
              if (data.P >= threshold && data.iou >= iouThreshold) {
                DrawBoundingBox(data, canvasOverlay, threshold, ratioX, ratioY)
              }
            }
          }
        }
        toggleCanvasLoader(true)
        found = true
        lastUpdateTime = new Date()
      }
    }).fail(function (response, status, err) {
      console.error(`${funcName}error : ${err.statusText}`)
      toggleCanvasLoader(true)
    })
  } catch (err) {
    console.error(`${funcName} : ${err.statusText}`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    if (count === 0) throw err
    return await testDetectionDrawingToCanvas(imagePath, inferenceResults, threshold, iouThreshold, count - 1)
  }

  return found
}

// Checks image in Blob Storage and display it.
async function telemetryEventsDrawingToCanvas (imagePath, inferenceResults, threshold, iouThreshold, count) {
  // need to clear spinner on exit
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)
  let found = false

  try {
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'ZoneDetection/GetImageFromBlob',
      data: {
        imageSearch: imagePath
      }
    }).done(async function (response) {
      const json = JSON.parse(response.value)
      if (json.uri.length === 0) {
        await new Promise(resolve => setTimeout(resolve, 3000))
        if (count === 0) throw new Error('End of retry process')
        return await telemetryEventsDrawingToCanvas(imagePath, inferenceResults, threshold, iouThreshold, count - 1)
      } else {
        const canvasId = 'zoneDetectionCanvas'
        const overlayCanvsId = 'zoneDetectionCanvasOverlay'
        const json = JSON.parse(response.value)
        const canvasImage = document.getElementById(canvasId)
        const ctxImage = canvasImage.getContext('2d')
        const canvasOverlay = document.getElementById(overlayCanvsId)
        const ctxOverlay = canvasOverlay.getContext('2d')
        const img = new Image()
        img.src = json.uri
        img.onload = function () {
          ctxOverlay.clearRect(0, 0, canvasOverlay.width, canvasOverlay.height)
          ctxImage.clearRect(0, 0, canvasImage.width, canvasImage.height)
          ctxImage.globalCompositeOperation = 'source-over'
          ctxImage.drawImage(img, 0, 0, canvasImage.width, canvasImage.height)

          const ratioX = canvasImage.width / img.width
          const ratioY = canvasImage.height / img.height

          if (inferenceResults != null) {
            for (let i = 0; i < inferenceResults.length; i++) {
              const data = inferenceResults[i]

              // DrawingBoundingBox process in image mode
              if (pplMode === 0 && data.P >= threshold) {
                DrawBoundingBox(data, canvasOverlay, threshold, ratioX, ratioY)
              } else if (data.P >= threshold && data.iou >= iouThreshold) {
                DrawBoundingBox(data, canvasOverlay, threshold, ratioX, ratioY)
              }
            }
          }
        }
        toggleCanvasLoader(true)
        found = true
      }
    }).fail(function (response, status, err) {
      console.error(`${funcName}error : ${err.statusText}`)
      toggleCanvasLoader(true)
    })
  } catch (err) {
    console.error(`${funcName} : ${err.statusText}`)
    await new Promise(resolve => setTimeout(resolve, 3000))
    if (count === 0) throw err
    return await telemetryEventsDrawingToCanvas(imagePath, inferenceResults, threshold, iouThreshold, count - 1)
  }

  return found
}

// Draw bounding box and add annotation
function DrawBoundingBox (data, canvasOverlay, threshold, offsetX, offsetY) {
  // var funcName = `${arguments.callee.name}()`
  // console.debug(`=> ${funcName}`)

  const ctxOverlay = canvasOverlay.getContext('2d')

  // console.debug(`>> Threshold ${threshold} P ${data.P}`)

  ctxOverlay.font = '12px serif'
  ctxOverlay.lineWidth = 1
  ctxOverlay.textBaseline = 'bottom'
  ctxOverlay.strokeStyle = 'yellow'

  const X = parseInt(data.Left * offsetX)
  const Y = parseInt(data.Top * offsetY)
  const x = parseInt(data.Right * offsetX)
  const y = parseInt(data.Bottom * offsetY)
  const w = x - X
  const h = y - Y

  ctxOverlay.lineWidth = 2
  ctxOverlay.strokeRect(X, Y, w, h)
  let confidence = `${(data.P * 100).toFixed(1).toString()}%`
  confidence = `${confidence}`
  ctxOverlay.lineWidth = 1
  ctxOverlay.strokeText(confidence, X + 2, y)

  ctxOverlay.textBaseline = 'top'
  ctxOverlay.strokeStyle = 'lime'
  confidence = `${parseInt(data.iou * 100)}%`
  ctxOverlay.lineWidth = 1
  ctxOverlay.strokeText(confidence, X + 2, Y + 2)
}

// A wrapper to start inference.  Used to test parameters.
async function StartInference (resultElementId) {
  const funcName = `${arguments.callee.name}()`
  console.debug('=>', funcName)
  const resultElement = document.getElementById(resultElementId)

  try {
    if (checkTokenExp(token)) await getToken()
    setResultElement(resultElement, 'Starting Inference')
    let frequency = parseFloat(document.getElementById('zoneDetectionFrequencySlider').value)
    frequency = frequency === 0 ? 1 : Math.round((frequency * 1000) / 33.3)
    const PPLParameter = {
      header: {
        id: '00',
        version: '01.01.00'
      },
      dnn_output_detections: 64,
      max_detections: 5,
      mode: 0,
      zone: {
        top_left_x: rectZone[0] === -1 ? 0 : parseInt(rectZone[0]),
        top_left_y: rectZone[1] === -1 ? 0 : parseInt(rectZone[1]),
        bottom_right_x: rectZone[2] === -1 ? 320 : parseInt(rectZone[2]),
        bottom_right_y: rectZone[3] === -1 ? 320 : parseInt(rectZone[3])
      },
      threshold: {
        iou: 0,
        score: 0
      },
      input_width: 320,
      input_height: 320
    }
    await ManagementCommandParameter(currentDeviceId, COMMAND_PARAM_FILE_NAME, null, 'StartUploadInferenceData',
      1, 'BlobStorage', 'JPG', 'MQTT', null, null, null, null,
      null, frequency, 1, null, null, null, PPLParameter, currentModelId)

    await $.ajax({
      async: true,
      type: 'POST',
      url: window.location.origin + '/' + 'sony/StartUploadInferenceResult',
      data: {
        token,
        deviceId: currentDeviceId
      }
    }).done(function (response) {
      const result = JSON.parse(response.value)
      testDetectionFlg = true
      if (result.result === 'SUCCESS') {
        pendingImagePath = result.outputSubDirectory
        setResultElement(resultElement, `Processing images @ ${result.outputSubDirectory.split('/')[3]}`)
      } else {
        setResultElement(resultElement, `Failed to start : ${result.result}`)
      }
    })
  } catch (err) {
    if (checkTokenExp(token)) await getToken()
    console.error(`${funcName}: ${err.statusText}`)
    testDetectionFlg = false
    // call stop just to be certain.
    await $.ajax({
      async: true,
      type: 'POST',
      url: window.location.origin + '/' + 'sony/StopUploadInferenceResult',
      data: {
        token,
        deviceId: currentDeviceId
      }
    })
  }
}

// Utility function to draw zone rect. For Zone Detection canvas.
function DrawZoneRect (canvasId) {
  // draw bounding box for zone detection
  const overlayCanvas = document.getElementById(canvasId)
  const overlayCanvasCtx = overlayCanvas.getContext('2d')
  overlayCanvasCtx.strokeStyle = 'red'
  overlayCanvasCtx.lineWidth = 3
  overlayCanvasCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
  overlayCanvasCtx.globalAlpha = 0.3
  overlayCanvasCtx.fillStyle = 'red'
  overlayCanvasCtx.fillRect(rectZone[0], rectZone[1], (rectZone[2] - rectZone[0]), (rectZone[3] - rectZone[1]))
}

// A wrapper function to start Zone Detection
async function StartZoneDetection (resultElementId) {
  const funcName = `${arguments.callee.name}()`
  console.debug('=>', funcName)
  const resultElement = document.getElementById(resultElementId)
  let bStarted = false

  try {
    if (checkTokenExp(token)) await getToken()
    setResultElement(resultElement, 'Starting Zone Detection Inference')
    let frequency = parseFloat(document.getElementById('zoneDetectionFrequencySlider').value)
    frequency = frequency === 0 ? 1 : Math.round((frequency * 1000) / 33.3)
    const modelId = currentModelId
    const NumberOfInferencesPerMessage = null
    const CropHOffset = null
    const CropVOffset = null
    const CropHSize = null
    const CropVSize = null
    const NumberOfImages = 0 // continuous
    const MaxDetectionsPerFrame = null
    const UploadMethod = 'BlobStorage'
    const UploadMethodIR = 'MQTT'
    const FileFormat = 'JPG'
    ClearZoneDetectionCanvas()
    const PPLParameter = {
      header: {
        id: '00',
        version: '01.01.00'
      },
      dnn_output_detections: 64,
      max_detections: 5,
      mode: pplMode,
      zone: {
        top_left_x: rectZone[0] === -1 ? 0 : parseInt(rectZone[0]),
        top_left_y: rectZone[1] === -1 ? 0 : parseInt(rectZone[1]),
        bottom_right_x: rectZone[2] === -1 ? 320 : parseInt(rectZone[2]),
        bottom_right_y: rectZone[3] === -1 ? 320 : parseInt(rectZone[3])
      },
      threshold: {
        iou: currentIoUThreshold,
        score: currentThreshold
      },
      input_width: 320,
      input_height: 320
    }
    if (withImage) {
      // Image & Inference results
      const Mode = 1 // Image & Inference results
      await ManagementCommandParameter(currentDeviceId, COMMAND_PARAM_FILE_NAME, null, 'StartUploadInferenceData',
        Mode, UploadMethod, FileFormat, UploadMethodIR, CropHOffset, CropVOffset, CropHSize, CropVSize,
        NumberOfImages, frequency, NumberOfInferencesPerMessage, MaxDetectionsPerFrame, null, null, PPLParameter, modelId)

      await $.ajax({
        async: true,
        type: 'POST',
        url: window.location.origin + '/' + 'sony/StartUploadInferenceResult',
        data: {
          token,
          deviceId: currentDeviceId
        }
      }).done(function (response) {
        const result = JSON.parse(response.value)

        if (result.result === 'SUCCESS') {
          pendingImagePath = result.outputSubDirectory
          setResultElement(resultElement, `Processing images @ ${result.outputSubDirectory.split('/')[3]}`)
          // draw bounding box for zone detection
          DrawZoneRect('zoneDetectionCanvasZoneOverlay')
          bStarted = true
        } else {
          setResultElement(resultElement, `Failed to start : ${result.result}`)
        }
      }).fail(function (response, status, err) {
        setResultElement(resultElement, `Failed to start : ${response.responseJSON.value}`)
        console.error(`${funcName}: ${response.responseJSON.value}`)
      })
    } else {
      // No image.  Inference results only.
      const Mode = 2 // Image & Inference results
      await ManagementCommandParameter(currentDeviceId, COMMAND_PARAM_FILE_NAME, null, 'StartUploadInferenceData',
        Mode, UploadMethod, FileFormat, UploadMethodIR, CropHOffset, CropVOffset, CropHSize, CropVSize,
        NumberOfImages, frequency, NumberOfInferencesPerMessage, MaxDetectionsPerFrame, null, null, PPLParameter, modelId)
      await $.ajax({
        async: true,
        type: 'POST',
        url: window.location.origin + '/' + 'sony/StartUploadInferenceResult',
        data: {
          token,
          deviceId: currentDeviceId
        }
      }).done(function (response) {
        const ts = getTimeStamp()
        pendingImagePath = `deviceId/meta/subDir/${ts}`
        setResultElement(resultElement, 'Processing Telemetry')
        // draw bounding box for zone detection
        DrawZoneRect('zoneDetectionCanvasZoneOverlay')
        bStarted = true
      }).fail(function (response, status, err) {
        setResultElement(resultElement, `Failed to start : ${response.responseJSON.value}`)
        console.error(`${funcName}: ${response.responseJSON.value}`)
      })
    }
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
  }
  return bStarted
}

// A wrapper function to stop inference
async function StopInference (resultElementId) {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)
  let resultElement
  let bStopped = false
  pendingImagePath = ''
  testDetectionFlg = false

  if (resultElementId !== undefined) {
    resultElement = document.getElementById(resultElementId)
  }

  try {
    if (checkTokenExp(token)) await getToken()
    if (resultElement !== undefined) {
      setResultElement(resultElement, 'Stopping Inference')
    }

    const url = window.location.origin + '/' + 'sony/StopUploadInferenceResult'

    await $.ajax({
      async: true,
      type: 'POST',
      url,
      data: {
        token,
        deviceId: currentDeviceId
      },
      statusCode: {
        200: function (data) {
          if (resultElementId !== undefined) {
            setResultElement(resultElement, 'Stopped')
            bStopped = true
          }
        }
      }
    }).then(function (response, textStatus, jqXHR) {
      if (resultElementId !== undefined) {
        setResultElement(resultElement, `Stopped (Status = ${jqXHR.status})`)
      }
    })
  } catch (err) {
    console.error(`${funcName}: ${err.statusText}`)
    if (resultElementId !== undefined) {
      setResultElement(resultElement, err.statusText)
    }
  } finally {
    if (bStopped === false) {
      // try stopping the other one
      const url = window.location.origin + '/' + 'sony/StopUploadInferenceResult'

      if (checkTokenExp(token)) await getToken()
      await $.ajax({
        async: true,
        type: 'POST',
        url,
        data: {
          token,
          deviceId: currentDeviceId
        },
        200: function (data) {
          if (resultElementId !== undefined) {
            setResultElement(resultElement, 'Stopped')
            bStopped = true
          }
        },
        202: function (data) {
          if (resultElementId !== undefined) {
            setResultElement(resultElement, 'Stopped')
            bStopped = true
          }
        }
      }).done(function (response, textStatus, jqXHR) {

      }).fail(function (response, status, err) {
        console.error(`${funcName} error : ${err.statusText}`)
      })
    }
  }

  return bStopped
}

// A wrapper function to save parameters to cookie.
async function SaveParameter () {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)
  if (checkTokenExp(token)) await getToken()
  await $.ajax({
    async: true,
    type: 'POST',
    url: window.location.origin + '/' + 'ZoneDetection/SaveParameters',
    data: {
      deviceId: currentDeviceId,
      capturePhotoUrl
    }
  }).done(function (response) {
    // var result = JSON.parse(response.value)
  })
  let frequency = parseFloat(captureFrequencySliderLabel.innerHTML)
  frequency = frequency === 0 ? 1 : Math.round((frequency * 1000) / 33.3)
  const FrequencyOfImages = frequency.toString()
  const modelId = currentModelId
  const NumberOfInferencesPerMessage = null
  const CropHOffset = null
  const CropVOffset = null
  const CropHSize = null
  const CropVSize = null
  const NumberOfImages = 0 // continuous
  const MaxDetectionsPerFrame = null
  ClearZoneDetectionCanvas()
  const UploadMethod = 'BlobStorage'
  const UploadMethodIR = 'MQTT'
  const FileFormat = 'JPG'
  const PPLParameter = {
    header: {
      id: '00',
      version: '01.01.00'
    },
    dnn_output_detections: 64,
    max_detections: 5,
    mode: pplMode,
    zone: {
      top_left_x: rectZone[0] === -1 ? 0 : parseInt(rectZone[0]),
      top_left_y: rectZone[1] === -1 ? 0 : parseInt(rectZone[1]),
      bottom_right_x: rectZone[2] === -1 ? 320 : parseInt(rectZone[2]),
      bottom_right_y: rectZone[3] === -1 ? 320 : parseInt(rectZone[3])
    },
    threshold: {
      iou: currentIoUThreshold,
      score: currentThreshold
    },
    input_width: 320,
    input_height: 320
  }
  const Mode = 1 // Image & Inference results
  await ManagementCommandParameter(currentDeviceId, COMMAND_PARAM_FILE_NAME, null, 'StartUploadInferenceData',
    Mode, UploadMethod, FileFormat, UploadMethodIR, CropHOffset, CropVOffset, CropHSize, CropVSize,
    NumberOfImages, FrequencyOfImages, NumberOfInferencesPerMessage, MaxDetectionsPerFrame,
    null, null, PPLParameter, modelId)
}

// Sets Edge Device List and Model List selected items.
// Called if Edge Device ID and Model ID are retrieved from cookie
async function SetDeviceLists (deviceId) {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)

  try {
    let deviceListId = 'captureDeviceNameList'
    let resultElementId = 'captureImageBtnResult'
    await GetDevices(deviceListId, true, false, 'Select Device', '0', resultElementId)
      .then(async function (response) {
        document.getElementById(deviceListId).value = deviceId

        const modelListId = 'captureModelIdList'
        const resultElement = document.getElementById(resultElementId)

        await GetModelForDevice(modelListId, deviceId, resultElementId)
          .then(async function (isDisconnected) {
            if (await SetFromCommandParameterToDOM()) {
              const deviceList = document.getElementById(deviceListId)
              document.getElementById(modelListId).value = currentModelId
              deviceList[deviceList.selectedIndex].setAttribute('data-isDisconnected', isDisconnected)

              if (isDisconnected === false) {
                await StopInference(null)
              }
              document.getElementById(modelListId).value = currentModelId
              document.getElementById(modelListId).dispatchEvent(new Event('change'))
            }
          })
          .catch(() => {
            setResultElement(resultElement, 'Failed to retrieve model list')
          })
          .finally(() => {
          })
      })
      .catch((err) => {
        console.error(`${funcName}: ${err.statusText}`)
      })

    deviceListId = 'zoneDetectionDeviceNameList'
    resultElementId = 'startZoneDetectionBtnResult'
    await GetDevices(deviceListId, true, false, 'Select Device', '0', resultElementId)
      .then(async function (response) {
        document.getElementById(deviceListId).value = deviceId

        const modelListId = 'zoneDetectionModelIdList'
        const resultElement = document.getElementById(resultElementId)

        await GetModelForDevice(modelListId, deviceId, resultElementId)
          .then(async function (isDisconnected) {
            if (await SetFromCommandParameterToDOM()) {
              const deviceList = document.getElementById(deviceListId)
              document.getElementById(modelListId).value = currentModelId
              deviceList[deviceList.selectedIndex].setAttribute('data-isDisconnected', isDisconnected)
              document.getElementById(modelListId).value = currentModelId
              document.getElementById(modelListId).dispatchEvent(new Event('change'))
            }
          })
          .catch(() => {
            setResultElement(resultElement, 'Failed to retrieve model list')
          })
      })
      .catch((err) => {
        console.error(`${funcName}: ${err.statusText}`)
      })
  } finally {
    // toggleLoader(false)
  }
}

const parseCookie = str =>
  str
    .split(';')
    .map(v => v.split('='))
    .reduce((cookie, v) => {
      cookie[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim())
      return cookie
    }, {})

function startTimer () {
  elapsedTimer = setInterval(writeTime, 1000)
}

function stopTimer () {
  clearInterval(elapsedTimer)
}

function writeTime () {
  nowTime = new Date()
  const elapsedSecondsValue = document.getElementById('elapsedSecondsValue')
  elapsedSecondsValue.innerHTML = Math.floor((nowTime - lastUpdateTime) / 1000).toString()
}

function checkTokenExp (token) {
  const tokenArr = token.split('.')[1]
  const replaceToken = tokenArr.replace(/-/g, '+').replace(/_/g, '/')
  const tokenObj = JSON.parse(decodeURIComponent(encodeURI(window.atob(replaceToken))))
  // ms, multiply by 1000.
  const expTime = new Date(tokenObj.exp * 1000)
  const now = new Date()
  if ((now - expTime) / 60000 >= -3) {
    return true
  } else {
    return false
  }
}

function getTimeStamp () {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hours = String(now.getUTCHours()).padStart(2, '0')
  const minutes = String(now.getUTCMinutes()).padStart(2, '0')
  const seconds = String(now.getUTCSeconds()).padStart(2, '0')
  const millisec = String(now.getUTCMilliseconds()).padStart(3, '0')
  return `${year}${month}${day}${hours}${minutes}${seconds}${millisec}`
}
