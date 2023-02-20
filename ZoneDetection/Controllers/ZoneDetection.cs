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
using ZoneDetection.Models;
using System.Diagnostics;
using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;
using Azure.Storage.Sas;

namespace ZoneDetection.Controllers
{

    [Authorize]
    public class ZoneDetection : Controller
    {
        private readonly ILogger<SonyController> _logger;
        private readonly AppSettings _appSettings;
        private readonly IHttpContextAccessor _httpContextAccessor;
        static BlobContainerClient _blobContainerClient;
        static string userSasToken = string.Empty;

        public ZoneDetection(IOptions<AppSettings> optionsAccessor, ILogger<SonyController> logger, IHttpContextAccessor httpContextAccessor, IBlobClientFactory blobContainerClient)
        {
            _appSettings = optionsAccessor.Value;
            _logger = logger;
            _httpContextAccessor = httpContextAccessor;
            _blobContainerClient = blobContainerClient.Create(_appSettings.Blob.ConnectionString, _appSettings.Blob.ContainerName);
        }
        //[Authorize]
        public IActionResult Index()
        {
            if (_httpContextAccessor.HttpContext.Request.Cookies.ContainsKey("ZoneDetectionDevId"))
            {
                _logger.LogDebug("Test");
                //HttpContext.Response.Cookies.Append("ZoneDetectionDevId", DateTime.Now.ToString());
            }
            return View();
        }

        [HttpPost]
        public ActionResult SaveParameters(string deviceId, string capturePhotoUrl)
        {
            try
            {
                var cOptions = new CookieOptions()
                {
                    Path = "/",
                    Expires = new DateTimeOffset(DateTime.Now.AddDays(3))
                    //Expires = new DateTimeOffset(DateTime.Now.AddHours(3))
                };

                _httpContextAccessor.HttpContext.Response.Cookies.Append("ZoneDetectionDevId", deviceId, cOptions);
                _httpContextAccessor.HttpContext.Response.Cookies.Append("capturePhotoUrl", capturePhotoUrl, cOptions);
                return Ok();
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }


        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? _httpContextAccessor.HttpContext.TraceIdentifier });
        }

        public string GetSasToken()
        {
            try
            {
                if (_blobContainerClient.CanGenerateSasUri)
                {
                    BlobSasBuilder sasBuilder = new BlobSasBuilder()
                    {
                        BlobContainerName = _blobContainerClient.Name,
                        Resource = "b",
                        ExpiresOn = DateTime.UtcNow.AddHours(1)
                    };

                    sasBuilder.SetPermissions(BlobContainerSasPermissions.Read);
                    Uri sasUri = _blobContainerClient.GenerateSasUri(sasBuilder);
                    return sasUri.Query;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
            }

            return string.Empty;
        }

        [HttpGet]
        public async Task<ActionResult> GetImageFromBlob(string imageSearch)
        {
            try
            {
                await foreach (BlobItem item in _blobContainerClient.GetBlobsAsync())
                {
                    if (item.Name.IndexOf(imageSearch) < 0)
                    {
                        continue;
                    }

                    string sas = GetSasToken();
                    return Ok(Json($"{{\"uri\":\"{_blobContainerClient.Uri.AbsoluteUri}/{item.Name}{sas}\"}}"));

                }
                var responseDic = new Dictionary<string, string>();
                responseDic.Add("uri", "");
                return Ok(Json(JsonConvert.SerializeObject(responseDic)));
            }
            catch (Exception ex)
            {
                _logger.LogError($"Excetion in {System.Reflection.MethodBase.GetCurrentMethod().Name}() {ex.Message}");
                return BadRequest(ex.Message);
            }
        }

    }
}
