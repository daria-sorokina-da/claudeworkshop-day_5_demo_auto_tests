using NUnit.Framework;
using OpenQA.Selenium.Support.UI;
using HorseWorld.Tests.Base;
using HorseWorld.Tests.Pages;

namespace HorseWorld.Tests.Tests;

/// <summary>
/// Automates QA-2730: Generate horse names by style and gender.
/// https://anthonynolan.atlassian.net/browse/QA-2730
/// </summary>
[TestFixture]
public class NameGeneratorTests : BaseTest
{
    // Steps 1–5: navigate, select style + gender, generate, assert 5 cards and button state.
    [Test]
    public void GenerateNames_ElegantFemale_Returns5Cards()
    {
        var page = new NameGeneratorPage(Driver, StepDelayMs);

        // Step 1 — navigate to Name Generator
        page.NavigateTo();
        Assert.That(page.IsGenerateButtonEnabled(), Is.True, "Generate button should be enabled on load");

        // Step 2 — select style: elegant
        page.SelectStyle("elegant");
        Assert.That(page.IsStyleSelected("elegant"), Is.True, "Elegant style pill should be selected");

        // Step 3 — select gender: female
        page.SelectGender("female");
        Assert.That(page.IsGenderSelected("female"), Is.True, "Female gender pill should be selected");

        // Step 4 — click Generate (button goes disabled while request is in flight)
        page.ClickGenerate();

        // Step 5 — wait for exactly 5 name cards; button re-enables
        page.WaitForResults();
        page.WaitForButtonEnabled();
        Assert.That(page.NameCardCount(), Is.EqualTo(5), "Expected exactly 5 name cards");
        Assert.That(page.IsGenerateButtonEnabled(), Is.True, "Generate button should be re-enabled after results load");
    }

    // Step 6: copy button on first card shows confirmed "✓" state after click.
    [Test]
    public void CopyButton_FirstCard_ShowsConfirmedState()
    {
        var page = new NameGeneratorPage(Driver, StepDelayMs);
        page.NavigateTo();
        page.SelectStyle("elegant");
        page.SelectGender("female");
        page.ClickGenerate();
        page.WaitForResults();

        // Step 6 — click copy; button should flip to "✓"
        page.ClickCopyOnFirstCard();
        var copyWait = new WebDriverWait(Driver, TimeSpan.FromSeconds(3));
        copyWait.Until(_ => page.FirstCardCopyButtonText() == "✓");
        Assert.That(page.FirstCardCopyButtonText(), Is.EqualTo("✓"), "Copy button should show confirmed state");
    }

    // Step 7: re-generate with same selections returns another set of 5 cards.
    [Test]
    public void Regenerate_SameSelections_Returns5MoreCards()
    {
        var page = new NameGeneratorPage(Driver, StepDelayMs);
        page.NavigateTo();
        page.SelectStyle("elegant");
        page.SelectGender("female");

        // First generation
        page.ClickGenerate();
        page.WaitForResults();

        // Step 7 — generate again; view should update without error
        page.ClickGenerate();
        page.WaitForResults();
        page.WaitForButtonEnabled();
        Assert.That(page.NameCardCount(), Is.EqualTo(5), "Expected exactly 5 name cards after re-generation");
        Assert.That(page.IsGenerateButtonEnabled(), Is.True, "Generate button should be enabled after re-generation");
    }
}
