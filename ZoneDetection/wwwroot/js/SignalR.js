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

/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
function addEvent (id, type, deviceId, modelId, dataSource, time, data) {
  const dataObj = JSON.parse(data)
  const context = {
    eventTime: time,
    eventDeviceId: deviceId,
    eventModelId: modelId,
    eventType: type,
    eventSource: dataSource,
    eventId: id,
    eventData: JSON.stringify(dataObj, undefined, 2)
  }
  const source = document.getElementById('telemetry-template').innerHTML
  const template = Handlebars.compile(source)
  const html = template(context)
  $('#telemetryTbl').show()
  $('#telemetryTblDetails').prepend(html)

  const btnId = 'btn-' + id

  if (dataObj.Image === true) {
    document.getElementById(btnId).disabled = false
  } else {
    document.getElementById(btnId).classList.remove('btn-primary')
    document.getElementById(btnId).classList.add('btn-secondary')
  }
}

function addCosmosDbEvent (id, type, deviceId, modelId, dataSource, time, hasImage, data) {
  const context = {
    eventTime: time,
    deviceId,
    eventType: type,
    eventSource: dataSource,
    eventId: id,
    eventData: JSON.stringify(data, undefined, 2)
  }
  const source = document.getElementById('cosmosdb-template').innerHTML
  const template = Handlebars.compile(source)
  const html = template(context)
  $('#telemetryTbl').show()
  $('#telemetryTblDetails').prepend(html)

  const btnId = 'btn-' + id

  if (hasImage === true) {
    document.getElementById(btnId).disabled = false
  } else {
    document.getElementById(btnId).classList.remove('btn-primary')
    document.getElementById(btnId).classList.add('btn-secondary')
  }
}
