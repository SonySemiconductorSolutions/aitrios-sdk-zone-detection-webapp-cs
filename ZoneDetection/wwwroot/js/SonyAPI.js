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
/* eslint-disable no-caller */
/* eslint-disable no-undef */
// Utility functions

function setSelectOption (selectElementId, selectValue) {
  console.log('Setting ' + selectElementId + ' to ' + selectValue)

  document.getElementById(selectElementId).value = selectValue
  document.getElementById(selectElementId).dispatchEvent(new Event('change'))
}

function toggleLoader (bForceClear) {
  const loader = document.getElementById('loader')

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

function setResultElement (resultElement, msg) {
  if (resultElement === undefined || resultElement == null) {
    return
  }

  if (msg) {
    try {
      const json = JSON.parse(msg)

      if (json.result && json.result === 'ERROR') {
        if (json.message) {
          resultElement.innerHTML = json.message
        } else {
          resultElement.innerHTML = JSON.stringify(json)
        }
      } else {
        resultElement.innerHTML = msg
      }
    } catch (err) {
      resultElement.innerHTML = msg
    }
  }
}

function processError (funcName, err, bShowAlert) {
  let msg

  try {
    if (err.responseJSON) {
      msg = err.responseJSON.value
    } else {
      msg = err.statusText
    }
    if (bShowAlert) {
      alert(funcName + ' : ' + err.statusText + '(' + err.status + ') : ' + msg)
    }
  } catch (err) {
    // debugger;
  }
  return msg
}

function AddApiOutput (apiName, result) {
  let json
  if (typeof (result) === 'string') {
    json = JSON.parse(result)
  } else {
    json = result
  }

  document.getElementById('apiOutputLabel').innerHTML = apiName
  document.getElementById('tabApiOutput').value = null
  document.getElementById('tabApiOutput').value = JSON.stringify(json, null, 2)
}

async function GetDevices (listElementId, silent, isOption, placeHolderText, placeHolderValue, resultElementId) {
  const funcName = `${arguments.callee.name}()`
  console.debug('=>', funcName)
  let ret = true
  let resultElement = null
  let msg = null
  try {
    if (resultElementId != null) {
      resultElement = document.getElementById(resultElementId)
    }
    setResultElement(resultElement, 'Retrieving Device ID List')
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'sony/GetDevices',
      data: {
        token
      }
    }).done(function (response) {
      if (!silent) {
        AddApiOutput('GetDevices', response.value)
      }

      if (listElementId) {
        const json = JSON.parse(response.value)
        const list = document.getElementById(listElementId)

        list.innerText = null
        const option = new Option(placeHolderText, placeHolderValue)

        if (isOption) {
          option.disabled = false
        } else {
          option.disabled = true
        }
        list.append(option)
        for (const device in json.devices) {
          // list.append(new Option(json.devices[device].device_id, json.devices[device].device_id))
          const localOption = new Option(`${json.devices[device].property.device_name} (${json.devices[device].connectionState})`, json.devices[device].device_id)
          if (json.devices[device].connectionState === 'Connected') {
            localOption.classList.add('connectedDevice')
          } else {
            localOption.classList.add('disConnectedDevice')
          }
          list.append(localOption)
        }
        list.options[0].selected = true
      }

      setResultElement(resultElement, '&nbsp;')
    })
  } catch (err) {
    msg = processError(funcName, err, true)
    ret = false
  } finally {
    if (msg) {
      setResultElement(resultElement, msg)
    }
  }
  return ret
}

async function GetModelForDevice (listElementId, deviceId, resultElementId) {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)

  let resultElement = null
  let ret = true // assume disconnected  true = disconnected.

  try {
    if (listElementId) {
      document.getElementById(listElementId).disabled = true
    }

    if (resultElementId != null) {
      resultElement = document.getElementById(resultElementId)
    }

    setResultElement(resultElement, `Retrieving Model List for ${deviceId}`)
    if (checkTokenExp(token)) await getToken()
    await $.ajax({
      async: true,
      type: 'GET',
      url: window.location.origin + '/' + 'sony/GetDevice',
      data: {
        token,
        deviceId
      }
    }).done(function (response) {
      const json = JSON.parse(response.value)

      if (listElementId) {
        const list = document.getElementById(listElementId)

        list.innerText = null

        const option = new Option('Select from list', '')
        list.append(option)

        for (const model in json.models) {
          const modelId = json.models[model].model_version_id.split(':')
          list.append(new Option(modelId[0], modelId[0]))
        }
        list.options[0].selected = true
        list.disabled = false
      }

      if (json.connectionState === 'Connected') {
        ret = false
      }

      setResultElement(resultElement, '&nbsp;')
    })
  } catch (err) {
    setResultElement(resultElement, err.responseJSON.value)
  }

  return ret
}
