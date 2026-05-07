import React, { createContext, useContext, useState, useEffect } from 'react';

// ─── Translation Dictionary ────────────────────────────────────────────────────
export const translations: Record<string, Record<string, string>> = {

    // ── Sidebar Navigation ──────────────────────────────────────────────────────
    'Dashboard':                    { si: 'ඩැශ්බෝර්ඩ්' },
    'General Stock':                { si: 'සාමාන්‍ය තොගය' },
    'Morning Muster':               { si: 'උදේ මස්ටර්' },
    'Evening Muster':               { si: 'සවස මස්ටර්' },
    'Evening Muster History':       { si: 'සවස මස්ටර් ඉතිහාසය' },
    'Worker Registry':              { si: 'කම්කරු ලේඛනය' },
    'Crop Achievements':            { si: 'බෝග ජයග්‍රහණ' },
    'Field log':                    { si: 'ක්ෂේත්‍ර ලොගය' },
    'Fertilizer Programme':         { si: 'පොහොර වැඩසටහන' },
    'Distribution of Works':        { si: 'කාර්ය බෙදාහැරීම' },
    'Leave Application':            { si: 'නිවාඩු ඉල්ලීම' },
    'Order Request':                { si: 'ඇණවුම් ඉල්ලීම' },
    'Request / Pending Orders':     { si: 'බලාපොරොත්තු ඇණවුම්' },
    'Crop Book':                    { si: 'බෝග පොත' },
    'Cost Analysis':                { si: 'පිරිවැය විශ්ලේෂණය' },
    'Correspondence':               { si: 'ලිපි හුවමාරු' },
    'Job Roles & Tasks':            { si: 'රැකියා භූමිකා සහ කාර්යයන්' },
    'Inventory Management':         { si: 'තොග කළමනාකරණය' },
    'Operational Targets & Norms':  { si: 'මෙහෙයුම් ඉලක්ක සහ ප්‍රමිතීන්' },
    'Pending Approvals':            { si: 'අනුමත කිරීම් බලාපොරොත්තු' },
    'Leave Management':             { si: 'නිවාඩු කළමනාකරණය' },
    'Staff Management':             { si: 'කාර්ය මණ්ඩල කළමනාකරණය' },
    'Divisions':                    { si: 'ඩිවිෂන්' },
    'Muster Review':                { si: 'මස්ටර් සමාලෝචනය' },
    'Inventory':                    { si: 'තොගය' },
    'Recent Transactions':          { si: 'මෑත ගනුදෙනු' },
    'Configuration':                { si: 'වින්‍යාසය' },
    'Harvest Logs':                 { si: 'අස්වැන්න ලොග' },
    'Logout':                       { si: 'ඉවත් වීම' },

    // ── Header / Top Bar ────────────────────────────────────────────────────────
    'Manager Dashboard':            { si: 'කළමනාකරු ඩැශ්බෝර්ඩ්' },
    'Estate Admin Dashboard':       { si: 'දේපළ පරිපාල ඩැශ්බෝර්ඩ්' },
    'Field Officer Dashboard':      { si: 'ක්ෂේත්‍ර නිලධාරී ඩැශ්බෝර්ඩ්' },
    'Store Keeper Dashboard':       { si: 'ගබඩා භාරකාර ඩැශ්බෝර්ඩ්' },
    'Chief Clerk Dashboard':        { si: 'ප්‍රධාන ලිපිකරු ඩැශ්බෝර්ඩ්' },
    'Plantation Dashboard':         { si: 'වතු ඩැශ්බෝර්ඩ්' },
    'Notifications':                { si: 'දැනුම්දීම්' },
    'No pending alerts':            { si: 'ඇඟවීම් නොමැත' },
    'Account':                      { si: 'ගිණුම' },
    'Logged in as:':                { si: 'ලෙස ඇතුල් වී ඇත:' },

    // ── Common UI ────────────────────────────────────────────────────────────────
    'DIVISIONS':                    { si: 'ඩිවිෂන්' },
    'All Divisions':                { si: 'සියලු ඩිවිෂන්' },
    'Current Date':                 { si: 'වත්මන් දිනය' },
    'CURRENT DATE':                 { si: 'වත්මන් දිනය' },
    'Overview':                     { si: 'දළ විශ්ලේෂණය' },
    "Overview of your plantation's performance and yield.": { si: 'ඔබේ වතු කාර්යසාධනය සහ අස්වැන්නෙහි දළ විශ්ලේෂණය.' },
    'Welcome back,':                { si: 'නැවත සාදරයෙන් පිළිගනිමු,' },
    "Here's what's happening today.": { si: 'අද සිදු වෙන දේ මෙන්න.' },

    // ── Time Filters ─────────────────────────────────────────────────────────────
    'Day':                          { si: 'දිනය' },
    'Week':                         { si: 'සතිය' },
    'Month':                        { si: 'මාසය' },
    'Year':                         { si: 'වර්ෂය' },
    'Today':                        { si: 'අද' },
    'Daily':                        { si: 'දෛනික' },
    'Weekly':                       { si: 'සතිපතා' },
    'Monthly':                      { si: 'මාසිකව' },
    'Yearly':                       { si: 'වාර්ෂිකව' },
    'To-date':                      { si: 'දිනට' },
    'Last Month':                   { si: 'පසුගිය මාසය' },
    'YTD':                          { si: 'වර්ෂය-දක්වා' },

    // ── CropPerformanceCard ──────────────────────────────────────────────────────
    'Crop Performance (vs Budget)': { si: 'බෝග කාර්යසාධනය (අයවැය හා)' },
    'Crop':                         { si: 'බෝගය' },
    'Achievement':                  { si: 'ජයග්‍රහණය' },
    'ACHIEVEMENT':                  { si: 'ජයග්‍රහණය' },
    'Total harvested this month to date': { si: 'මේ මාසයේ අදට රැස්කළ මුළු ප්‍රමාණය' },
    'Target Budget':                { si: 'ඉලක්ක අයවැය' },
    'TARGET BUDGET':                { si: 'ඉලක්ක අයවැය' },
    'Budgeted for':                 { si: 'සඳහා අය කළ' },
    'Target Achievement':           { si: 'ඉලක්ක ජයග්‍රහණය' },
    'Shortfall of':                 { si: 'හිඟ ප්‍රමාණය:' },
    'kg to reach target.':          { si: 'kg ඉලක්කයට ළඟාවීමට.' },
    'Target Exceeded! Well done.':  { si: 'ඉලක්කය ඉක්මවා ගිය! ශාබාෂ්.' },
    'Contribution by Division':     { si: 'ඩිවිෂන් අනුව දායකත්වය' },
    'CONTRIBUTION BY DIVISION':     { si: 'ඩිවිෂන් අනුව දායකත්වය' },
    'No division-wise data available for this month.': { si: 'මෙම මාසය සඳහා ඩිවිෂන් දත්ත නොමැත.' },
    'No performance data available for this selection.': { si: 'මෙම තෝරාගැනීම සඳහා ක්‍රියාසාධන දත්ත නොමැත.' },

    // ── ProfitSummaryCard ────────────────────────────────────────────────────────
    'INTERNAL PROJECTIONS':         { si: 'අභ්‍යන්තර ඇස්තමේන්තු' },
    'Internal Projections':         { si: 'අභ්‍යන්තර ඇස්තමේන්තු' },
    'PROJECTION':                   { si: 'ඇස්තමේන්තුව' },
    'PROFITABLE':                   { si: 'ලාභදායී' },
    'POTENTIAL LOSS':               { si: 'ඇතිවිය හැකි අලාභය' },
    'Assumed Profit':               { si: 'ගණනය කළ ලාභය' },
    'ASSUMED PROFIT':               { si: 'ගණනය කළ ලාභය' },
    'Operating with Surplus':       { si: 'අතිරික්තතාවයෙන් ක්‍රියාත්මකවීම' },
    'Budget Shortfall':             { si: 'අයවැය හිඟය' },
    'Assumed green leaf rate':      { si: 'ගණනය කළ කොළ දල්ල අනුපාතය' },
    'Total Cost (Actual)':          { si: 'මුළු පිරිවැය (සත්‍ය)' },

    // ── YieldAnalytics ───────────────────────────────────────────────────────────
    'Yield Analytics':              { si: 'අස්වැන්න විශ්ලේෂණය' },
    'LIVE TREND':                   { si: 'සජීවී ප්‍රවාහය' },
    'Updated just now':             { si: 'දැනට යාවත්කාලීනයි' },

    // ── CostAnalytics ────────────────────────────────────────────────────────────
    'Cost Analytics':               { si: 'පිරිවැය විශ්ලේෂණය' },
    'Total Cost':                   { si: 'මුළු පිරිවැය' },
    'Plucking Cost Per Kg':         { si: 'කිලෝවකට කොළ කැඩීමේ පිරිවැය' },
    'Cost Distribution':            { si: 'පිරිවැය බෙදාහැරීම' },

    // ── Field Officer ────────────────────────────────────────────────────────────
    'Field Operation Center':       { si: 'ක්ෂේත්‍ර මෙහෙයුම් මධ්‍යස්ථානය' },
    'Yield per Acre':               { si: 'අක්කරයකට අස්වැන්න' },
    'Plucking Average':             { si: 'කොළ කැඩීමේ සාමාන්‍යය' },
    'Cost per Kg':                  { si: 'කිලෝවකට පිරිවැය' },
    'Production Cost':              { si: 'නිෂ්පාදන පිරිවැය' },
    'Month to Date':                { si: 'මාසය දිනට' },
    'Factory Weight Performance':   { si: 'කම්හල් බර කාර්යසාධනය' },
    "Today's Plan":                 { si: 'අදේ සැලැස්ම' },
    'Workers':                      { si: 'කම්කරුවන්' },
    'No assignments for this division yet.': { si: 'මෙම ඩිවිෂන් සඳහා පැවරීම් නොමැත.' },
    'AI FIELD INSIGHT':             { si: 'AI ක්ෂේත්‍ර තොරතුරු' },
    'Crop Book MTD':                { si: 'බෝග පොත MTD' },
    'Daily factory output for the current month.': { si: 'මෙම මාසයේ දෛනික කම්හල් ප්‍රතිදානය.' },
    'MORNING':                      { si: 'උදෑසන' },
    'EVENING':                      { si: 'සවස' },
    'Rain':                         { si: 'වර්ෂාව' },

    // ── Store Keeper ─────────────────────────────────────────────────────────────
    'PENDING ORDERS':               { si: 'බලාපොරොත්තු ඇණවුම්' },
    'CRITICAL ALERTS':              { si: 'තීරණාත්මක ඇඟවීම්' },
    'STOCK VALUE (LKR)':            { si: 'තොග වටිනාකම (රු.)' },
    'MESSAGES':                     { si: 'පණිවිඩ' },
    'ACTION REQUIRED: LOW STOCK':   { si: 'අඩු තොගය: ක්‍රියාවක් අවශ්‍යයි' },
    'No Action':                    { si: 'ක්‍රියාවක් නැත' },
    'Restock Reqd':                 { si: 'නැවත ගබඩා කිරීම අවශ්‍යයි' },
    'No new mail':                  { si: 'නව තැපෑලක් නැත' },
    'Below Critical Minimum':       { si: 'අනිවාර්ය අවම මට්ටමට පහළ' },

    // ── Roles ─────────────────────────────────────────────────────────────────────
    'Estate Admin':                 { si: 'දේපළ පරිපාලකයා' },
    'Manager':                      { si: 'කළමනාකරු' },
    'Field Officer':                { si: 'ක්ෂේත්‍ර නිලධාරී' },
    'Store Keeper':                 { si: 'ගබඩා භාරකාරයා' },
    'Chief Clerk':                  { si: 'ප්‍රධාන ලිපිකරු' },

    // ── General Stock page ───────────────────────────────────────────────────────
    'General Stock & Inventory Level': { si: 'සාමාන්‍ය තොගය සහ ඉන්වෙන්ටරි මට්ටම' },
    'Download Snapshot':            { si: 'ස්නැප්ශොට් බාගන්න' },
    'Action Required':              { si: 'ක්‍රියාවක් අවශ්‍යයි' },
    'New items detected. Please configure buffer levels for unconfigured items.': { si: 'නව අයිතම හඳුනාගත්තා. වින්‍යාස නොකළ අයිතම සඳහා බෆර් මට්ටම් සකසන්න.' },
    'Attention Manager: Inventory Shortfall Detected': { si: 'කළමනාකරු දැනුම්: ඉන්වෙන්ටරි හිඟයක් හඳුනාගනන ලදී' },
    'The following items have dropped below their buffer levels:': { si: 'පහත අයිතම ඔවුන්ගේ බෆර් මට්ටම්වලට පහළ ගොස් ඇත:' },
    'Pending Restock Requests':     { si: 'බලාපොරොත්තු නැවත ගබඩා ඉල්ලීම්' },
    'Item':                         { si: 'අයිතමය' },
    'Qty':                          { si: 'ප්‍රමාණය' },
    'Note':                         { si: 'සටහන' },
    'Actions':                      { si: 'ක්‍රියා' },
    'Review':                       { si: 'සමාලෝචනය' },
    'Item Name':                    { si: 'අයිතම නාමය' },
    'Category':                     { si: 'වර්ගය' },
    'Unit':                         { si: 'ඒකකය' },
    'Current Qty':                  { si: 'වත්මන් ප්‍රමාණය' },
    'Buffer':                       { si: 'බෆර්' },
    'Minimum':                      { si: 'අවම' },
    'Status':                       { si: 'තත්ත්වය' },
    'Good':                         { si: 'හොඳයි' },
    'Low':                          { si: 'අඩුයි' },
    'Setup':                        { si: 'සකසන්න' },
    'No inventory items found.':    { si: 'ඉන්වෙන්ටරි අයිතම හමු නොවිණි.' },
    'Update Stock Levels':          { si: 'තොග මට්ටම් යාවත්කාලීන කරන්න' },
    'Buffer Level (Reorder Point)': { si: 'බෆර් මට්ටම (නැවත ඇණවුම් ලක්ෂ්‍යය)' },
    'Minimum Level (Blocking Point)': { si: 'අවම මට්ටම (අවහිර ලක්ෂ්‍යය)' },
    'Stock level to trigger restock alerts': { si: 'නැවත ගබඩා ඇඟවීම් ඇති කිරීමේ තොග මට්ටම' },
    'Absolute minimum. Issues below this are blocked.': { si: 'අනිවාර්ය අවම. මෙට පහළ ගැටළු අවහිර කෙරේ.' },
    'Cancel':                       { si: 'අවලංගු කරන්න' },
    'Update':                       { si: 'යාවත්කාලීන කරන්න' },
    'Review Refill Request':        { si: 'නැවත පිරවීමේ ඉල්ලීම සමාලෝචනය' },
    'Reject Request':               { si: 'ඉල්ලීම ප්‍රතික්ෂේප කරන්න' },
    'Final Approve & Refill':       { si: 'අවසන් අනුමැතිය සහ නැවත පිරවීම' },
    'Quantity to Refill':           { si: 'නැවත පිරවීමේ ප්‍රමාණය' },
    'Manager Remarks (Optional)':   { si: 'කළමනාකරු සටහන් (අමතරව)' },

    // ── Muster History (HistoryTab in DailyEntry.tsx) ────────────────────────────
    'Muster History':               { si: 'මස්ටර් ඉතිහාසය' },
    'Review and track past operational records': { si: 'අතීත මෙහෙයුම් වාර්තා සමාලෝචනය සහ නිරීක්ෂණය' },
    'Records':                      { si: 'වාර්තා' },
    'Date':                         { si: 'දිනය' },
    'Division':                     { si: 'ඩිවිෂන' },
    'Submitted At':                 { si: 'ඉදිරිපත් කළ වේලාව' },
    'Action':                       { si: 'ක්‍රියාව' },
    'View':                         { si: 'බලන්න' },
    'View Details':                 { si: 'විස්තර බලන්න' },
    'Audited':                      { si: 'විගණනය' },
    'NEW REMARK':                   { si: 'නව සටහනක්' },
    'No records found.':            { si: 'වාර්තා හමු නොවිණි.' },
    'No muster records found.':     { si: 'මස්ටර් වාර්තා හමු නොවිණි.' },
    'Delete Report':                { si: 'වාර්තාව මකන්න' },
    'Close Review':                 { si: 'සමාලෝචනය වසන්න' },

    // ── Correspondence ──────────────────────────────────────────────────────────
    'Correspondence':               { si: 'ලිපි හුවමාරු' },
    'All Personnel':                { si: 'සියලු කාර්ය මණ්ඩලය' },
    'No messages yet':              { si: 'තවම පණිවිඩ නොමැත' },
    'Start a conversation with':    { si: 'සමග සංවාදයක් ආරම්භ කරන්න' },
    'Image attached':               { si: 'රූපය අමුණා ඇත' },
    'Attach Image':                 { si: 'රූපය අමුණන්න' },
    'Broadcast':                    { si: 'ගුවන් විදුලිය' },
    'Write a message...':           { si: 'පණිවිඩයක් ලියන්න...' },
    'Broadcast Message':            { si: 'ගුවන් විදුලි පණිවිඩය' },
    'Send Now':                     { si: 'දැන් යවන්න' },
    'Search contacts...':           { si: 'සම්බන්ධතා සොයන්න...' },
    'Online':                       { si: 'සබැඳිව' },
    'Offline':                      { si: 'විසන්ධිව' },

    // ── Leave Application ───────────────────────────────────────────────────────
    'Leave Application':            { si: 'නිවාඩු අයදුම්පත' },
    'Leave Balance':                { si: 'නිවාඩු ශේෂය' },
    'Metric':                       { si: 'මිනුම' },
    'Duty':                         { si: 'රාජකාරී' },
    'Annual':                       { si: 'වාර්ෂික' },
    'Casual':                       { si: 'සාමාන්‍ය' },
    'Medical':                      { si: 'වෛද්‍ය' },
    'Available':                    { si: 'ලබා ගත හැකි' },
    'Apply':                        { si: 'අයදුම් කරන්න' },
    'Previous':                     { si: 'පෙර' },
    'To Date':                      { si: 'මේ දක්වා' },
    'Balance':                      { si: 'ශේෂය' },
    'Applicant Info':               { si: 'අයදුම්කරු තොරතුරු' },
    'Name':                         { si: 'නම' },
    'Position':                     { si: 'තනතුර' },
    'Leave Type':                   { si: 'නිවාඩු වර්ගය' },
    'From':                         { si: 'ආරම්භය' },
    'To':                           { si: 'අවසාන' },
    'Total Days (calculated)':      { si: 'මුළු දින (ගණනය කරන ලද)' },
    'Reason For Leave':             { si: 'නිවාඩු හේතුව' },
    'Address While on Leave':       { si: 'නිවාඩු කාලයේ ලිපිනය' },
    'Contact Number':               { si: 'ඇමතුම් අංකය' },
    'Acting Arrangement':           { si: 'ක්‍රියාකාරී ව්‍යවස්ථාව' },
    'Submit Application':           { si: 'අයදුම්පත ඉදිරිපත් කරන්න' },
    'Submitting Application...':    { si: 'අයදුම්පත ඉදිරිපත් කරමින්...' },
    'Your Recent Leave Applications': { si: 'ඔබේ මෑත නිවාඩු අයදුම්පත්' },
    'Submission Date':              { si: 'ඉදිරිපත් කිරීමේ දිනය' },
    'Days':                         { si: 'දින' },
    'Acting Person':                { si: 'ක්‍රියාකාරී පුද්ගලයා' },
    'Waiting for review...':        { si: 'සමාලෝචනය සඳහා බලා සිටී...' },
    'Application Submitted':        { si: 'අයදුම්පත ඉදිරිපත් කරන ලදී' },
    'Pending':                      { si: 'බලා සිටී' },
    'Approved':                     { si: 'අනුමත කරන ලදී' },
    'Rejected':                     { si: 'ප්‍රතික්ෂේප කරන ලදී' },
    'Okay, Got it':                 { si: 'හරි, තේරුණා' },

    // ── Order Request ───────────────────────────────────────────────────────────
    'Order Request':                { si: 'ඇණවුම් ඉල්ලීම' },
    'Current Inventory':            { si: 'වත්මන් ඉන්වෙන්ටරිය' },
    'Stock':                        { si: 'තොගය' },
    'Request Details':              { si: 'ඉල්ලීම් විස්තර' },
    'Field No':                     { si: 'ක්ෂේත්‍ර අංකය' },
    'Crop':                         { si: 'බෝගය' },
    'Quantity Needed':              { si: 'අවශ්‍ය ප්‍රමාණය' },
    'Remarks / Note':               { si: 'සටහන් / කෙටි නිවේදනය' },
    'Submit Request':               { si: 'ඉල්ලීම ඉදිරිපත් කරන්න' },

    // ── Divisions ───────────────────────────────────────────────────────────────
    'Divisions':                    { si: 'ඩිවිෂන්' },
    'Add Division':                 { si: 'ඩිවිෂන් එකතු කරන්න' },
    'No Divisions Found':           { si: 'ඩිවිෂන් හමු නොවිණි' },
    'Start mapping your estate by adding a division.': { si: 'ඩිවිෂන් එකතු කිරීමෙන් ඔබේ ආදායම් ක්ෂේත්‍රය සිතියම් ගත කිරීම ආරම්භ කරන්න.' },
    'Create Division':              { si: 'ඩිවිෂන් සාදන්න' },
    'Edit Division':                { si: 'ඩිවිෂන් සංස්කරණය' },
    'New Division':                 { si: 'නව ඩිවිෂන්' },
    'Division Name':                { si: 'ඩිවිෂන් නාමය' },
    'Save':                         { si: 'සුරකින්න' },
    'Uncultivated Land':            { si: 'වගා නොකළ ඉඩම' },
    'Fields':                       { si: 'ක්ෂේත්‍ර' },
    'Add Field':                    { si: 'ක්ෂේත්‍රය එකතු කරන්න' },
    'Manage Map':                   { si: 'සිතියම කළමනාකරණය' },

    // ── Distribution of Works ───────────────────────────────────────────────────
    'Distribution of Works':        { si: 'කාර්ය බෙදාහරීම' },
    'Job Roles & Tasks':            { si: 'රැකියා භූමිකා සහ කාර්යයන්' },
    'Add Task':                     { si: 'කාර්යය එකතු කරන්න' },
    'Task Name':                    { si: 'කාර්යය නාමය' },
    'No tasks found.':              { si: 'කාර්යයන් හමු නොවිණි.' },
    'Edit Task':                    { si: 'කාර්යය සංස්කරණය' },
    'Delete Task':                  { si: 'කාර්යය මකන්න' },

    // ── Staff Management / Worker Registry ────────────────────────────────────
    'Staff Management':             { si: 'කාර්ය මණ්ඩල කළමනාකරණය' },
    'Worker Registry':              { si: 'කම්කරු ලේඛනය' },
    'Add Worker':                   { si: 'කම්කරු එකතු කරන්න' },
    'Worker Name':                  { si: 'කම්කරු නාමය' },
    'Employment Type':              { si: 'රැකියා වර්ගය' },
    'PERMANENT':                    { si: 'ස්ථිර' },
    'CASUAL':                       { si: 'සාමාන්‍ය' },
    'CONTRACT':                     { si: 'කොන්ත්‍රාත්' },
    'Active':                       { si: 'ක්‍රියාත්මකව' },
    'Inactive':                     { si: 'අක්‍රිය' },
    'Total Workers':                { si: 'මුළු කම්කරුවන්' },
    'Search workers...':            { si: 'කම්කරුවන් සොයන්න...' },

    // ── Crop Book ───────────────────────────────────────────────────────────────
    'Crop Book':                    { si: 'බෝග පොත' },
    'Field':                        { si: 'ක්ෂේත්‍රය' },
    'Acreage':                      { si: 'අක්කර' },
    'Total Yield':                  { si: 'මුළු අස්වැන්න' },
    'Target':                       { si: 'ඉලක්කය' },
    'Variance':                     { si: 'විචලනය' },
    'No data available.':           { si: 'දත්ත නොමැත.' },

    // ── KPIs ────────────────────────────────────────────────────────────────────
    'KPIs':                         { si: 'ප්‍රධාන කාර්ය සාධන දර්ශක' },
    'Key Performance Indicators':   { si: 'ප්‍රධාන කාර්ය සාධන දර්ශක' },

    // ── Pending Orders ──────────────────────────────────────────────────────────
    'Pending Orders':               { si: 'බලා සිටින ඇණවුම්' },
    'Approve':                      { si: 'අනුමත කරන්න' },
    'Decline':                      { si: 'ප්‍රතික්ෂේප කරන්න' },
    'Approved':                     { si: 'අනුමත කරන ලදී' },
    'Declined':                     { si: 'ප්‍රතික්ෂේප කරන ලදී' },
    'Requested By':                 { si: 'ඉල්ලීම් කළේ' },
    'Quantity':                     { si: 'ප්‍රමාණය' },
    'Requested On':                 { si: 'ඉල්ලීම් කළ දිනය' },

    // ── Store Keeper ────────────────────────────────────────────────────────────
    'Store Keeper':                 { si: 'ගබඩා භාරකාරයා' },
    'Add Stock':                    { si: 'තොගය එකතු කරන්න' },
    'Transaction History':          { si: 'ගනුදෙනු ඉතිහාසය' },
    'Restock':                      { si: 'නැවත ගබඩා' },
    'Issued':                       { si: 'නිකුත් කළ' },
    'Received':                     { si: 'ලැබුණු' },
    'Type':                         { si: 'වර්ගය' },
    'Total':                        { si: 'මුළු' },
    'No transactions found.':       { si: 'ගනුදෙනු හමු නොවිණි.' },

    // ── DistributionOfWorks extras ──────────────────────────────────────────────
    'Work Program':                 { si: 'කාර්ය වැඩසටහන' },
    'Provide Justification':        { si: 'සාධාරණීකරණය සපයන්න' },
    'Saving...':                    { si: 'සුරකිමින්...' },
    'Send to Chief Clerk':          { si: 'ප්‍රධාන ලිපිකරුට යවන්න' },
    'Clear Filter':                 { si: 'පෙරහන ඉවත් කරන්න' },

    // ── PendingOrders extras ────────────────────────────────────────────────────
    'Orders & Requisitions':        { si: 'ඇණවුම් සහ ඉල්ලීම්' },
    'Divisional Stock':             { si: 'ඩිවිෂන් තොගය' },
    'Filter by Division':           { si: 'ඩිවිෂන් අනුව පෙරහන' },
    'My Order History':             { si: 'මගේ ඇණවුම් ඉතිහාසය' },
    'Issued':                       { si: 'නිකුත් කළ' },
    'Cancelled':                    { si: 'අවලංගු කළ' },

    // ── Common extras ───────────────────────────────────────────────────────────
    'Date':                         { si: 'දිනය' },
    'Status':                       { si: 'තත්ත්වය' },
    'Cancel':                       { si: 'අවලංගු' },
    'Division':                     { si: 'ඩිවිෂන්' },
    'Item':                         { si: 'කාරිතය' },
    'Unit':                         { si: 'ඒකකය' },
    'Manager Remarks (Optional)':   { si: 'කළමනාකරු සටහන් (අමතරව)' },

    // ── Crop Book ─────────────────────────────────────────────────────────────
    'Crop Book':                    { si: 'බෝග පොත' },
    'Month':                        { si: 'මාසය' },
    'Download Snapshot':            { si: 'සාරාංශය බාගත කරන්න' },
    'Budget Targets':               { si: 'අයවැය ඉලක්ක' },
    'Wage Rates':                   { si: 'වැටුප් අනුපාත' },
    'Budgets':                      { si: 'අයවැය' },
    'Wages':                        { si: 'වැටුප්' },
    'Factory Weight':               { si: 'කර්මාන්තශාලා බර' },
    'Field Weight':                 { si: 'ක්ෂේත්‍ර බර' },
    'Checkroll Weight':             { si: 'චෙක්රෝල් බර' },
    'Yield per Acre':               { si: 'අක්කරයක අස්වැන්න' },
    'No. Of Pluckers':              { si: 'නෙලන්නන් සංඛ්‍යාව' },
    'Over kilos':                   { si: 'අතිරික්ත කිලෝ' },
    'Cash Kilos':                   { si: 'මුදල් කිලෝ' },
    'Plucking Average':             { si: 'නෙලීමේ සාමාන්‍යය' },
    'Plucking Cost per Kg':         { si: 'කිලෝග්‍රෑමයක නෙලීමේ පිරිවැය' },
    'Day':                          { si: 'දිනය' },
    'Todate':                       { si: 'අද දක්වා' },
    'Budgeted crop for the Year':   { si: 'වසර සඳහා අයවැයගත අස්වැන්න' },
    'Achieved Crop - Todate':       { si: 'අද දක්වා ලබාගත් අස්වැන්න' },
    'Total Achieved To Date':       { si: 'අද දක්වා මුළු අස්වැන්න' },
    'Achievement (vs Annual Budget)': { si: 'සාධනය (වාර්ෂික අයවැයට සාපේක්ෂව)' },
    'Budgeted crop for':            { si: 'සඳහා අයවැයගත අස්වැන්න' },
    'Budgeted Crop for todate':     { si: 'අද දක්වා අයවැයගත අස්වැන්න' },
    'Achievement For':              { si: 'සඳහා සාධනය' },
    'Achievement For To Date':      { si: 'අද දක්වා සාධනය' },
    'Aththama Wage':                { si: 'අත්තම වැටුප' },
    'Over Kilo Rate':               { si: 'අතිරික්ත කිලෝ අනුපාතය' },
    'Cash Kilo Rate':               { si: 'මුදල් කිලෝ අනුපාතය' },
    'OT Hour Rate':                 { si: 'අතිකාල පැය අනුපාතය' },
    'Edit Budget Metrics':          { si: 'අයවැය දත්ත සංස්කරණය' },
    'Budgeted Crop for the Year (Kg)': { si: 'වසර සඳහා අයවැයගත අස්වැන්න (කිලෝ)' },
    'Budgeted Crop up to Last Month (Kg)': { si: 'පසුගිය මාසය දක්වා අයවැයගත අස්වැන්න (කිලෝ)' },
    'Budgeted Crop for the Month (Kg)': { si: 'මාසය සඳහා අයවැයගත අස්වැන්න (කිලෝ)' },
    'Working Days for the Month':   { si: 'මාසය සඳහා වැඩ කරන දින' },
    'Working Day Calendar':         { si: 'වැඩ කරන දින දින දර්ශනය' },
    'Weekdays start as working days by default. Click a date to mark it on or off for': { si: 'වැඩ කරන දින පෙරනිමියෙන් ආරම්භ වේ. දිනයක් සක්‍රිය හෝ අක්‍රිය කිරීමට එය මත ක්ලික් කරන්න.' },
    'Working day':                  { si: 'වැඩ කරන දිනය' },
    'Off day':                      { si: 'නිවාඩු දිනය' },
    'Weekend':                      { si: 'සති අන්තය' },
    'Save Changes':                 { si: 'වෙනස්කම් සුරකින්න' },
    'Edit Plucking Wages':          { si: 'නෙලීමේ වැටුප් සංස්කරණය' },
    'Aththama Daily Wage (රු.)':    { si: 'අත්තම දෛනික වැටුප (රු.)' },
    'Over Kilo Rate (රු. / Kg)':    { si: 'අතිරික්ත කිලෝ අනුපාතය (රු. / කිලෝ)' },
    'Cash Kilo Rate (රු. / Kg)':    { si: 'මුදල් කිලෝ අනුපාතය (රු. / කිලෝ)' },
    'OT Hour Rate (රු. / Hour)':    { si: 'අතිකාල පැය අනුපාතය (රු. / පැය)' },
};





// ─── Context Types ─────────────────────────────────────────────────────────────
type Language = 'en' | 'si';

interface LanguageContextType {
    language: Language;
    toggleLanguage: () => void;
    t: (key: string) => string;
}

// ─── Context ───────────────────────────────────────────────────────────────────
const LanguageContext = createContext<LanguageContextType>({
    language: 'en',
    toggleLanguage: () => {},
    t: (key) => key,
});

// ─── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children }: { children: React.ReactNode }) {
    const [language, setLanguage] = useState<Language>(() => {
        return (localStorage.getItem('app_language') as Language) || 'en';
    });

    const toggleLanguage = () => {
        setLanguage(prev => {
            const next = prev === 'en' ? 'si' : 'en';
            localStorage.setItem('app_language', next);
            return next;
        });
    };

    const t = (key: string): string => {
        if (language === 'en') return key;
        return translations[key]?.[language] || key;
    };

    useEffect(() => {
        window.dispatchEvent(new CustomEvent('language-changed', { detail: { language } }));
    }, [language]);

    return (
        <LanguageContext.Provider value={{ language, toggleLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useLanguage() {
    return useContext(LanguageContext);
}
