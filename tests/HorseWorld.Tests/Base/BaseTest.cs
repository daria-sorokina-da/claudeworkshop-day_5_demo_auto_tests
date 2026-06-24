using NUnit.Framework;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;

namespace HorseWorld.Tests.Base;

[TestFixture]
public abstract class BaseTest
{
    protected IWebDriver Driver { get; private set; } = null!;
    protected WebDriverWait Wait => new(Driver, TimeSpan.FromSeconds(10));

    // Set TEST_STEP_DELAY_MS=800 (or any ms value) to slow down actions for local debugging.
    protected int StepDelayMs { get; private set; }

    [SetUp]
    public void SetUp()
    {
        StepDelayMs = int.TryParse(Environment.GetEnvironmentVariable("TEST_STEP_DELAY_MS"), out var d) ? d : 0;

        var options = new ChromeOptions();
        // options.AddArgument("--headless"); // uncomment for CI
        Driver = new ChromeDriver(options);
        Driver.Manage().Window.Maximize();
        Driver.Manage().Timeouts().ImplicitWait = TimeSpan.FromSeconds(0);
    }

    [TearDown]
    public void TearDown()
    {
        Driver?.Quit();
        Driver?.Dispose();
    }
}
