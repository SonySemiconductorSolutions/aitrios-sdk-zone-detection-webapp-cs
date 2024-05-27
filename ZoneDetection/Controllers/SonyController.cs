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

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using ZoneDetection.Models;
using System.Net;
using System.Net.Http.Headers;
using System.Text;

namespace ZoneDetection.Controllers
{
    [Authorize]
    public class SonyController : Controller
    {
        private readonly ILogger<SonyController> _logger;
        private readonly AppSettings _appSettings;
        private readonly HttpClient _client;

        public SonyController(IOptions<AppSettings> optionsAccessor, ILogger<SonyController> logger, HttpClient client)
        {
            _appSettings = optionsAccessor.Value;
            _logger = logger;
            _client = client;
        }

        private void AddRequestHeader(string token)
        {
            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            _client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
            _client.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
            _client.DefaultRequestHeaders.Host = baseUri.Host;
        }

        private async Task<HttpResponseMessage> SendGet(string requestSegment, string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException("{\"status\":\"Need Token\"}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");

            AddRequestHeader(token);

            return await _client.GetAsync(requestUri.AbsoluteUri);
        }
        private async Task<HttpResponseMessage> SendPost(string requestSegment, string token)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException(@"{'status':'Need Token'}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");

            AddRequestHeader(token);

            return await _client.PostAsync(requestUri.AbsoluteUri, null);
        }

        private async Task<HttpResponseMessage> SendPostRaw(string requestSegment, string token, HttpContent content)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException(@"{'status':'Need Token'}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");

            AddRequestHeader(token);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            return await _client.PostAsync(requestUri.AbsoluteUri, content);
        }

        private async Task<HttpResponseMessage> SendPutRaw(string requestSegment, string token, HttpContent content)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException(@"{'status':'Need Token'}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");

            AddRequestHeader(token);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            return await _client.PutAsync(requestUri.AbsoluteUri, content);
        }

        private async Task<HttpResponseMessage> SendPatchRaw(string requestSegment, string token, HttpContent content)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException(@"{'status':'Need Token'}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");
            AddRequestHeader(token);
            content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            return await _client.PatchAsync(requestUri.AbsoluteUri, content);
        }

        public async Task<HttpResponseMessage> SendDeleteRaw(string requestSegment, string token, HttpContent content)
        {
            if (string.IsNullOrEmpty(token))
            {
                throw new ArgumentException(@"{'status':'Need Token'}");
            }

            Uri baseUri = new Uri(_appSettings.SonyApi.BaseUrl);
            Uri requestUri = new Uri($"{baseUri.AbsoluteUri}/{requestSegment}");
            AddRequestHeader(token);
            HttpRequestMessage request = new HttpRequestMessage
            {
                Method = HttpMethod.Delete,
                RequestUri = requestUri
            };
            request.Content = content;
            request.Content.Headers.ContentType = new System.Net.Http.Headers.MediaTypeHeaderValue("application/json");
            return await _client.SendAsync(request);
            
        }        

        #region SONYAPIGET
        [HttpGet]
        public async Task<ActionResult> GetSCSToken()
        {
            try
            {
                var parameters = new Dictionary<string, string>()
                {
                    { "client_id", _appSettings.SonyApi.ClientId },
                    { "client_secret", _appSettings.SonyApi.ClientSecret },
                    { "scope", "system" },
                    { "grant_type", "client_credentials" }
                };
                var content = new FormUrlEncodedContent(parameters);
                System.Net.Http.HttpResponseMessage response = null;

                Uri requestUri = new Uri(_appSettings.SonyApi.TokenUrl);// TokenUrl
                response = await _client.PostAsync(requestUri.AbsoluteUri, content);

                var jsonString = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<ActionResult> GetCommadParameterFile(string token)
        {
            try
            {
                string urlSegment = $"command_parameter_files";
                List<string> options = new List<string>();
                var response = await SendGet(urlSegment, token);
                var jsonString = await response.Content.ReadAsStringAsync();
                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpGet]
        public async Task<ActionResult> GetDevice(string token, string deviceId)
        {
            try
            {
                var response = await SendGet($"devices/{deviceId}", token);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }

        }

        [HttpGet]
        public async Task<ActionResult> GetDevices(string token)
        {
            try
            {
                var response = await SendGet("devices", token);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }
        #endregion

        #region SONYAPIPOST
        [HttpPost]
        public async Task<ActionResult> RegistCommandParameterFile(string token,
                                                                   string fileName,
                                                                   string comment,
                                                                   string commandName,
                                                                   string mode,
                                                                   string uploadMethod,
                                                                   string fileFormat,
                                                                   string uploadMethodIR,
                                                                   string cropHOffset,
                                                                   string cropVOffset,
                                                                   string cropHSize,
                                                                   string cropVSize,
                                                                   string numberOfImages,
                                                                   string uploadInterval,
                                                                   string numberOfInferencesPerMessage,
                                                                   string maxDetectionsPerFrame,
                                                                   string storageSubDirectoryPath,
                                                                   string storageSubDirectoryPathIR,
                                                                   string pplParameter,
                                                                   string modelId)
        {
            try
            {
                string urlSegment = $"command_parameter_files";
                var httpContent = new Dictionary<string, string>();

                var base64parameter = createBase64Parameter(commandName, mode, uploadMethod, fileFormat, uploadMethodIR, cropHOffset,
                                                            cropVOffset, cropHSize, cropVSize, numberOfImages, uploadInterval,
                                                            numberOfInferencesPerMessage, maxDetectionsPerFrame, storageSubDirectoryPath,
                                                            storageSubDirectoryPathIR, pplParameter, modelId);
                if (!string.IsNullOrEmpty(fileName)) httpContent.Add("file_name", fileName);
                if (!string.IsNullOrEmpty(base64parameter)) httpContent.Add("parameter", base64parameter);
                if (!string.IsNullOrEmpty(comment)) httpContent.Add("comment", comment);

                var contentJson = JsonConvert.SerializeObject(httpContent);
                var encodeContent = new StringContent(contentJson, Encoding.UTF8, "application/json");

                var response = await SendPostRaw(urlSegment, token, encodeContent);

                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    Console.WriteLine(jsonString);
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        public async Task<ActionResult> StartUploadInferenceResult(string token, string deviceId)
        {
            try
            {
                string urlSegment = $"devices/{deviceId}/inferenceresults/collectstart";
                var response = await SendPost(urlSegment, token);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        [HttpPost]
        public async Task<ActionResult> StopUploadInferenceResult(string token, string deviceId)
        {
            try
            {
                string urlSegment = $"devices/{deviceId}/inferenceresults/collectstop";
                var response = await SendPost(urlSegment, token);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    var jsonData = JObject.Parse(jsonString);

                    if (jsonData["message"].ToString().Contains("AlreadyStopped"))
                    {
                        response.StatusCode = HttpStatusCode.Accepted;
                        return Accepted(Json(jsonString));
                    }
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        #endregion

        [HttpPut]
        public async Task<ActionResult> ApplyCommandParameterFileToDevice(string token,
                                                                         string deviceId,
                                                                         string fileName)
        {
            try
            {
                string urlSegment = $"devices/configuration/command_parameter_files/{fileName}";
                var httpContent = new Dictionary<string, string>();

                if (!string.IsNullOrEmpty(deviceId)) httpContent.Add("device_ids", deviceId);
                var contentJson = JsonConvert.SerializeObject(httpContent);
                var encodeContent = new StringContent(contentJson, Encoding.UTF8, "application/json");
                var response = await SendPutRaw(urlSegment, token, encodeContent);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }
        [HttpDelete]
        public async Task<ActionResult> UnBindCommandParameterFileToDevice(string token,
                                                                         string deviceId,
                                                                         string fileName)
        {
            try
            {
                string urlSegment = $"devices/configuration/command_parameter_files/{fileName}";
                var httpContent = new Dictionary<string, string>();

                if (!string.IsNullOrEmpty(deviceId)) httpContent.Add("device_ids", deviceId);
                var contentJson = JsonConvert.SerializeObject(httpContent);
                var encodeContent = new StringContent(contentJson, Encoding.UTF8, "application/json");
                var response = await SendDeleteRaw(urlSegment, token, encodeContent);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }
        
        [HttpPatch]
        public async Task<ActionResult> UpdateCommandParameterFile(string token,
                                                                   string fileName,
                                                                   string comment,
                                                                   string commandName,
                                                                   string mode,
                                                                   string uploadMethod,
                                                                   string fileFormat,
                                                                   string uploadMethodIR,
                                                                   string cropHOffset,
                                                                   string cropVOffset,
                                                                   string cropHSize,
                                                                   string cropVSize,
                                                                   string numberOfImages,
                                                                   string uploadInterval,
                                                                   string numberOfInferencesPerMessage,
                                                                   string maxDetectionsPerFrame,
                                                                   string storageSubDirectoryPath,
                                                                   string storageSubDirectoryPathIR,
                                                                   string pplParameter,
                                                                   string modelId)
        {
            try
            {
                string urlSegment = $"command_parameter_files/{fileName}";
                var httpContent = new Dictionary<string, string>();
                var base64parameter = createBase64Parameter(commandName, mode, uploadMethod, fileFormat, uploadMethodIR, cropHOffset,
                                                            cropVOffset, cropHSize, cropVSize, numberOfImages, uploadInterval,
                                                            numberOfInferencesPerMessage, maxDetectionsPerFrame, storageSubDirectoryPath,
                                                            storageSubDirectoryPathIR, pplParameter, modelId);
                if (!string.IsNullOrEmpty(base64parameter)) httpContent.Add("parameter", base64parameter);
                if (!string.IsNullOrEmpty(comment)) httpContent.Add("comment", comment);

                var contentJson = JsonConvert.SerializeObject(httpContent);
                var encodeContent = new StringContent(contentJson, Encoding.UTF8, "application/json");
                var response = await SendPatchRaw(urlSegment, token, encodeContent);
                var jsonString = await response.Content.ReadAsStringAsync();

                if (response.IsSuccessStatusCode)
                {
                    return Ok(Json(jsonString));
                }
                else
                {
                    Console.WriteLine("ELSE ERR" + jsonString);
                    return StatusCode(StatusCodes.Status500InternalServerError, Json(jsonString));
                }
            }
            catch (ArgumentException ex)
            {
                return StatusCode(StatusCodes.Status400BadRequest, Json(ex.Message));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

        public class Commands
        {
            public string command_name { get; set; }
            public dynamic parameters { get; set; }
        }

        private string createBase64Parameter(string commandName,
                                            string mode,
                                            string uploadMethod,
                                            string fileFormat,
                                            string uploadMethodIR,
                                            string cropHOffset,
                                            string cropVOffset,
                                            string cropHSize,
                                            string cropVSize,
                                            string numberOfImages,
                                            string uploadInterval,
                                            string numberOfInferencesPerMessage,
                                            string maxDetectionsPerFrame,
                                            string storageSubDirectoryPath,
                                            string storageSubDirectoryPathIR,
                                            string pplParameter,
                                            string modelId)
        {

            var commandParameter = new { commands = new List<Commands>() };
            var commands = new Commands();
            var paramDic = new Dictionary<string, object>();


            if (!string.IsNullOrEmpty(mode)) paramDic.Add("Mode", Int32.Parse(mode));
            if (!string.IsNullOrEmpty(uploadMethod)) paramDic.Add("UploadMethod", uploadMethod);
            if (!string.IsNullOrEmpty(fileFormat)) paramDic.Add("FileFormat", fileFormat);
            if (!string.IsNullOrEmpty(uploadMethodIR)) paramDic.Add("UploadMethodIR", uploadMethodIR);
            if (!string.IsNullOrEmpty(cropHOffset)) paramDic.Add("CropHOffset", Int32.Parse(cropHOffset));
            if (!string.IsNullOrEmpty(cropVOffset)) paramDic.Add("CropVOffset", Int32.Parse(cropVOffset));
            if (!string.IsNullOrEmpty(cropHSize)) paramDic.Add("CropHSize", Int32.Parse(cropHSize));
            if (!string.IsNullOrEmpty(cropVSize)) paramDic.Add("CropVSize", Int32.Parse(cropVSize));
            if (!string.IsNullOrEmpty(numberOfImages)) paramDic.Add("NumberOfImages", Int32.Parse(numberOfImages));
            if (!string.IsNullOrEmpty(uploadInterval)) paramDic.Add("UploadInterval", Int32.Parse(uploadInterval));
            if (!string.IsNullOrEmpty(numberOfInferencesPerMessage)) paramDic.Add("NumberOfInferencePerMessage", Int32.Parse(numberOfInferencesPerMessage));
            if (!string.IsNullOrEmpty(maxDetectionsPerFrame)) paramDic.Add("MaxDetectionsPerFrame", Int32.Parse(maxDetectionsPerFrame));
            if (!string.IsNullOrEmpty(storageSubDirectoryPath)) paramDic.Add("StorageSubDirectoryPath", storageSubDirectoryPath);
            if (!string.IsNullOrEmpty(storageSubDirectoryPathIR)) paramDic.Add("StorageSubDirectoryPathIR", storageSubDirectoryPathIR);
            if (!string.IsNullOrEmpty(pplParameter))
            {
                paramDic.Add("PPLParameter", JObject.Parse(pplParameter));
            }
            else
            {
                var pplParam = new Dictionary<string, object>();
                pplParam.Add("header", new { id = "00", version = "01.01.00" });
                pplParam.Add("dnn_output_detections", 10);
                pplParam.Add("max_detections", 10);
                pplParam.Add("threshold", 0.3);
                pplParam.Add("input_width", 320);
                pplParam.Add("input_height", 320);
                paramDic.Add("PPLParameter", pplParam);
            }
            if (!string.IsNullOrEmpty(modelId)) paramDic.Add("ModelId", modelId);

            commands.command_name = commandName;
            commands.parameters = paramDic;
            commandParameter.commands.Add(commands);

            var jsonParam = JsonConvert.SerializeObject(commandParameter);

            return Convert.ToBase64String(Encoding.UTF8.GetBytes(jsonParam));
        }
    }

}
