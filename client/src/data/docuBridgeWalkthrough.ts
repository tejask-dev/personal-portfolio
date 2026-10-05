export const docuBridgeSource = "https://github.com/tejask-dev/Docubridge-Intership/blob/a6c9d2b4e81b9fa3bc6d61d9958f03936174ee2f/Backend/app.py";
export const docuBridgeStages = [
  { name: "Input", eyebrow: "01 / A spreadsheet", title: "Start with the file.", body: "The upload handler accepts Excel or CSV and returns file and worksheet information. This walkthrough uses an invented workbook; nothing is uploaded.", lines: "L532-L584", code: ["File reference", "Available sheets"] },
  { name: "Worksheet", eyebrow: "02 / Deliberate selection", title: "Choose what to analyze.", body: "Excel workbooks can contain several tables. The selected worksheet is saved and used by the analysis and question paths. CSV follows its own parser path.", lines: "L590-L635", code: ["selected_sheet", "Parsed dataframe"] },
  { name: "Analysis", eyebrow: "03 / An inspectable table", title: "Expose the structure.", body: "The analyzer produces structured results and charts. Column names and numeric columns remain available to the interface alongside the analysis.", lines: "L641-L669", code: ["analysis", "charts", "columns", "numeric_columns"] },
  { name: "Questions", eyebrow: "04 / Ask about that table", title: "Keep the source in scope.", body: "The question endpoint reloads the selected worksheet and passes it into the answer path. The question shown here is illustrative; no model or historical backend is called.", lines: "L705-L753", code: ["Question", "Selected worksheet", "Response"] },
  { name: "Output", eyebrow: "05 / An explicit response", title: "Leave a path to inspection.", body: "The interface can present the returned answer and retrieve charts separately. Source-defined structures are inspectable; they are not evidence of forecast accuracy or customer adoption.", lines: "L754-L801", code: ["Answer", "Chart reference", "Question history"] },
] as const;
export const illustrativeWorksheets = {
  Revenue: { columns: ["Month", "Revenue"], rows: [["January", "120"], ["February", "150"], ["March", "140"]], question: "Which month has the highest revenue?", answer: "February: 150 sample units." },
  Operations: { columns: ["Month", "Tickets resolved"], rows: [["January", "30"], ["February", "24"], ["March", "36"]], question: "Which month has the most resolved tickets?", answer: "March: 36 sample tickets." },
} as const;
