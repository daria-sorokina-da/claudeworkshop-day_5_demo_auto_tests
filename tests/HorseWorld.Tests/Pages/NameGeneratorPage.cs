using OpenQA.Selenium;
using OpenQA.Selenium.Support.UI;

namespace HorseWorld.Tests.Pages;

public class NameGeneratorPage
{
    private const string Url = "http://localhost:3737/name-generator";

    private readonly IWebDriver _driver;
    private readonly WebDriverWait _wait;
    private readonly int _stepDelayMs;

    public NameGeneratorPage(IWebDriver driver, int stepDelayMs = 0)
    {
        _driver = driver;
        _wait = new WebDriverWait(driver, TimeSpan.FromSeconds(10));
        _stepDelayMs = stepDelayMs;
    }

    private void Pause()
    {
        if (_stepDelayMs > 0) Thread.Sleep(_stepDelayMs);
    }

    // Locators
    private IWebElement StylePill(string style)
        => _driver.FindElement(By.CssSelector($"[data-testid='style-{style}']"));

    private IWebElement GenderPill(string gender)
        => _driver.FindElement(By.CssSelector($"[data-testid='gender-{gender}']"));

    private IWebElement GenerateButton
        => _driver.FindElement(By.CssSelector(".gen-btn"));

    private IReadOnlyCollection<IWebElement> NameCards
        => _driver.FindElements(By.CssSelector(".name-card"));

    // Actions
    public void NavigateTo() { _driver.Navigate().GoToUrl(Url); Pause(); }

    public void SelectStyle(string style) { StylePill(style).Click(); Pause(); }

    public void SelectGender(string gender) { GenderPill(gender).Click(); Pause(); }

    public void ClickGenerate() { GenerateButton.Click(); Pause(); }

    public void WaitForResults()
        => _wait.Until(d => d.FindElements(By.CssSelector(".name-card")).Count == 5);

    public void WaitForButtonDisabled()
        => _wait.Until(d => !d.FindElement(By.CssSelector(".gen-btn")).Enabled);

    public void WaitForButtonEnabled()
        => _wait.Until(d => d.FindElement(By.CssSelector(".gen-btn")).Enabled);

    // Queries
    public bool IsStyleSelected(string style)
        => StylePill(style).GetAttribute("aria-pressed") == "true";

    public bool IsGenderSelected(string gender)
        => GenderPill(gender).GetAttribute("aria-pressed") == "true";

    public bool IsGenerateButtonEnabled()
        => GenerateButton.Enabled;

    public int NameCardCount() => NameCards.Count;

    public void ClickCopyOnFirstCard()
        => NameCards.First().FindElement(By.CssSelector(".copy-btn")).Click();

    public string FirstCardCopyButtonText()
        => NameCards.First().FindElement(By.CssSelector(".copy-btn")).Text;
}
