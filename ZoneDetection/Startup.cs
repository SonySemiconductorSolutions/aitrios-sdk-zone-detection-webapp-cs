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
using Microsoft.Identity.Web;
using Microsoft.Identity.Web.UI;
using ZoneDetection.Hubs;
using ZoneDetection.Models;

namespace ZoneDetection
{
    public class Startup
    {
        private bool _useAAD = false;
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        // This method gets called by the runtime. Use this method to add services to the container.
        public void ConfigureServices(IServiceCollection services)
        {
            var config = Configuration.GetSection("Azure").Get<AppSettings>();

            if (config.UseAAD)
            {
                // enable AAD Authentication
                _useAAD = true;
                services.AddMicrosoftIdentityWebAppAuthentication(Configuration, "AzureAd");
            }

            services.AddMvc();
            services.AddControllersWithViews()
                .AddMicrosoftIdentityUI();
            services.AddHttpClient();
            services.AddHttpContextAccessor();
            services.AddSingleton<IBlobClientFactory, BlobClientFactory>();

            services.Configure<AppSettings>(Configuration.GetSection("Azure"));
            services.AddSignalR(options => options.EnableDetailedErrors = true)
                .AddAzureSignalR(Configuration.GetSection("Azure")
                                    .GetSection("SignalR")
                                    .GetValue<string>("ConnectionString"));
        }

        // This method gets called by the runtime. Use this method to configure the HTTP request pipeline.
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
            }
            else
            {
                app.UseExceptionHandler("/ZoneDetection/Error");
            }

            app.UseStaticFiles();
            app.UseRouting();
            app.UseCookiePolicy();
            app.UseAuthentication();
            app.UseAuthorization();

            app.UseAzureSignalR(routes =>
            {
                routes.MapHub<TelemetryHub>("/telemetryhub");
            });

            app.UseEndpoints(endpoints =>
            {
                if (_useAAD != true)
                {
                    endpoints.MapControllers().WithMetadata(new AllowAnonymousAttribute());
                }

                endpoints.MapControllerRoute(
                    name: "default",
                    pattern: "{controller=ZoneDetection}/{action=Index}/{id?}");
            });
        }
    }
}
