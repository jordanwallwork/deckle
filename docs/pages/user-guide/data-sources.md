---
title: Data Sources
layout: libdoc_page.liquid
permalink: data-sources/index.html
eleventyNavigation:
    key: Data Sources
    parent: User Guide
    order: 3
date: 2026-01-16
---

You can link external data sources to your project, which allows you to create multiple variants of components by using merge fields to automatically customise individual components.

View/manage data sources by selecting the 'Data Sources' tab from the project page.

<iframe width="700px" height="400px" src="https://embed.app.guidde.com/playbooks/tvcctuAX8Mo2YqakQ5BSMm?mode=videoOnly" title="Link Data Sources to Components in Deckle" frameborder="0" referrerpolicy="unsafe-url" allowfullscreen="true" allow="clipboard-write" sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-forms allow-same-origin allow-presentation" style="border-radius: 10px"></iframe>
<div style="display: none">
 <p>00:00: This tutorial guides you through linking a data source to a component within Deckle.</p>
 <p>00:05: You will learn how to connect Google Sheets data and configure it for use in your project components.</p>
 <p>00:10: Click the Data Sources section to begin managing your data connections.</p>
 <p>00:14: Click the Add Data Source button to start linking a new data source.</p>
 <p>00:18: Switch to your Google Sheets document where your data is stored.</p>
 <p>00:22: Click the Share button to manage sharing permissions for your Google Sheet.</p>
 <p>00:26: Click the area to adjust link sharing settings for your document.</p>
 <p>00:30: Click here to enable link sharing so Deckle can access the data.</p>
 <p>00:34: Ensure</p>
 <p>00:35: 'Anyone with the link' is selected.</p>
 <p>00:38: Click Copy link to copy the Google Sheets URL to your clipboard.</p>
 <p>00:42: Click Done to close the sharing settings dialog.</p>
 <p>00:45: Switch back to the Deckle application to continue linking your data source.</p>
 <p>00:50: Click the Google Sheets URL field to prepare for pasting your link.</p>
 <p>00:54: Enter your data source name to identify it within Deckle.</p>
 <p>00:58: Click Add Data Source to save and link your Google Sheets data.</p>
 <p>01:02: Click Components to access the list of components in your project.</p>
 <p>01:06: Click Edit Front to modify the front design of your selected component.</p>
 <p>01:11: Maximise the Data Sources panel</p>
 <p>01:13: And then select Link Data Source to connect your component with a data source.</p>
 <p>01:18: Select the data source that you want to link to the current component.</p>
 <p>01:21: Here we will select the one that we just added.</p>
 <p>01:23: Then click 'Link Data Source' to confirm.</p>
 <p>01:27: Your data source is now linked!</p>
 <p>01:29: Minimise the Data Source panel to move it out of the way while we update the component design.</p>
 <p>01:35: You can use merge fields to display values from your data inside of Text elements</p>
 <p>01:40: Just enter the column name inside two pairs of curly braces.</p>
 <p>01:43: Here we adding the card name.</p>
 <p>01:45: And over here we will display the card Power</p>
 <p>01:47: By adding the Power merge field</p>
 <p>01:50: You can use the arrow buttons to view the card design using different rows from your linked data source</p>
 <p>01:57: Or if you maximise the Data Source panel again</p>
 <p>02:00: You can click on a specific data source row to update the card design</p>
 <p>02:08: Click Save to apply all changes and finalize your component setup.</p>
 <p>02:12: You have successfully linked to Google sheets data source to your decal component and configured dynamic content placeholders.</p>
 <p>02:18: Next you can customise additional components or Explorer data driven design features to enhance your project.</p>
</div>

# Adding Data Sources

## Google Sheets

To link a Google Sheets data source to your project, click on the 'Data Sources' tab on the project overview screen, and click 'Add Data Source'. 

_In Google Sheets:_
 - Click on the Share button
 - Ensure the sheet is accessible by setting 'General Access' to 'Anyone with the link'
 - Click 'Copy Link' to get the Google Sheets URL

_In Deckle:_
 - Fill in the Google Sheets URL
 - Optional: Give the data source a name, to make it easy to find/reference later
 - If your data source has multiple sheets, by default Deckle will read the first; however if you want to add a different sheet, you will need to set the sheets `gid`. To get this, view the sheet in Google Sheets and check the browser url. You will see the gid in the url as `#gid=123456` or `?gid=123456`
 
Click 'Add Data Source' to finish adding it to Deckle.

You can verify that the data was linked correctly by clicking the 'View' button beside the data source in the list; this will show a preview of the data.

# Syncing Data Sources

Since data sources are external, Deckle doesn't automatically know when they are changed.

To sync the latest changes from a data source, simply click the 'Sync' button on the Data Sources tab. You can also sync data sources directly from the Data Sources panel at the bottom of the [Component Editor](/user-guide/component-editor)

# Removing Data Sources

Removing a data source from a component is as simple as selecting 'Change Data Source' in the Component Editor Data Sources panel (or from the component card on the project Components tab) and selecting 'Remove Link'.

If you want to remove the data source entirely from the project, navigate to the project Data Sources tab and select Delete. This will remove the data source from the project, and will unlink any linked components. (Note: this will only remove the data source from Deckle; the original data source - ie. Google Sheet - will be unaffected).