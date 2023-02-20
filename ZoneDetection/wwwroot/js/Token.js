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

/* eslint-disable no-caller */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
let interval = null
let date = null

async function getToken () {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)

  if (interval) {
    clearInterval(interval)
    interval = null
  }
  await $.ajax({
    type: 'GET',
    url: window.location.origin + '/' + 'sony/GetSCSToken'
  }).done(function (response) {
    const tokenResp = JSON.parse(response.value)
    date = new Date()
    document.getElementById('spanTokenLastUpdate').innerHTML = date
    updateLoginTab(tokenResp)
    token = tokenResp.access_token
    if (interval == null) {
      interval = setInterval(function () { getToken() }, 30 * 60 * 1000)
    }
  }).fail(function (response, status, err) {
    alert('GetSCSToken Error ' + status)
  })
}

function updateLoginTab (tokenResp) {
  const funcName = `${arguments.callee.name}()`
  console.debug(`=> ${funcName}`)

  if (tokenResp == null) {
    document.getElementById('taToken').value = 'Access Token not found in response.'
    document.getElementById('btnGetTokenResult').innerHTML = 'Access Token not found in response'
  } else {
    document.getElementById('taToken').value = tokenResp.access_token
    document.getElementById('taToken').dispatchEvent(new Event('change'))

    if (String(expiresOn) !== String(tokenResp.expires_in)) {
      const expiresDate = date
      expiresDate.setHours(expiresDate.getHours() + 1)
      expiresOn = expiresDate
      document.getElementById('spanTokenExpire').innerHTML = String(expiresOn)
    }

    document.getElementById('btnGetTokenResult').innerHTML = 'completed'
  }
}
