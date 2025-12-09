
# Problem Statement Summary

## 1. Current Manual Workflow
- User handles **Client PO Module** and **Vendor Invoice Module**.
- PDFs received from clients/vendors must be manually read and data entered into forms.
- Data includes: client/vendor details, PO/invoice details, item details, values, terms, etc.
- Database stores **IDs**, not names (vendor_id, client_id, item_id).

## 2. Existing Database Structure
### Client PO Module
- Client Master  
- Item Master  
- PO Transaction Table (header)  
- PO Item Details Table  

### Vendor Invoice Module
- Vendor Master  
- Item Master  
- Invoice Header  
- Invoice Item Details  

## 3. Problems Identified
1. **Manual effort** in reading and entering PDF data.  
2. **Time-consuming**, repetitive process.  
3. PO/Invoice PDFs do not contain IDs → only names.  
4. Mandatory fields like **email, mobile, bank details** may be missing.  
5. Master creation blocked due to missing mandatory fields.  
6. Fuzzy name variations for vendors/items.  
7. Need to upload and process multiple PDFs (bulk upload).  

## 4. Requirements Finalized
### A. AI-based PDF Extraction
- Extract all readable data (client/vendor name, GSTIN, PAN, items, dates, values).

### B. Fuzzy Matching Rules
- Vendor & item names matched using fuzzy logic.  
- AI must **ask for confirmation** if match confidence is low.

### C. Master Handling Rules
#### If vendor/item **exists** in master:
- Use existing ID.

#### If vendor/item **does not exist**:
- AI must ask user:
  1. Select existing similar item/vendor OR  
  2. Create new item/vendor  

### D. Mandatory Field Handling
- If any mandatory field is missing:
  - AI stops and asks user to provide **all missing fields together**.

### E. Bulk Upload Support
- User wants the ability to upload multiple PDFs at once.

### F. Final Review Screen
- Before saving, AI must show a **full preview screen** of extracted + matched data.  
- User can edit or confirm.  
- Only after confirmation, system saves records.  

## 5. Additional Rules
- Slight name variations (e.g., “XYZ Pvt Ltd” vs “XYZ Private Limited”) should be treated as the same vendor after confirmation.  
- Items may require fuzzy matching.  
- AI should handle both digital and scanned PDFs (OCR).  

---

This file represents the complete problem statement and workflow understanding as discussed.
