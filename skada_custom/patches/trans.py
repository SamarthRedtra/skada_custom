import frappe

def add_translation():
    """Add custom translations to the system."""
    translations = {
        "Purchase Receipt": "Receive Note",
        "Buying": "Purchase"
    }

    for source_text, translated_text in translations.items():
        # Check if translation already exists
        existing_translation = frappe.get_all(
            "Translation",
            filters={"source_text": source_text, "language": "en"},
            fields=["name"],
        )
        if not existing_translation:
            # Create new translation entry
            if frappe.db.exists("Translation", {"source_text": source_text, "language": "en"}):
                continue
            translation_doc = frappe.get_doc({
                "doctype": "Translation",
                "source_text": source_text,
                "translated_text": translated_text,
                "language": "en"
            })
            translation_doc.insert(ignore_permissions=True)
            frappe.db.commit()



def execute():
    add_translation()