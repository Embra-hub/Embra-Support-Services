
(function(){
  function formToJSON(form) {
    const data = {};
    const fd = new FormData(form);
    for (const [key, value] of fd.entries()) {
      if (key in data) {
        // handle multi-select or checkboxes with same name
        if (Array.isArray(data[key])) data[key].push(value);
        else data[key] = [data[key], value];
      } else {
        data[key] = value;
      }
    }
    // Add a friendly label for the form
    data._form_title = form.getAttribute("data-form-title") || document.title || "Website Form";
    data._page_url = window.location.href;
    return data;
  }

  async function handleSubmit(e){
    const form = e.target.closest("form");
    if (!form || !form.classList.contains("emb-auto-pdf")) return;
    e.preventDefault();
    const submitBtn = form.querySelector("[type=submit]");
    const originalText = submitBtn ? submitBtn.textContent : null;
    if (submitBtn) submitBtn.textContent = "Submitting...";

    try {
      const payload = formToJSON(form);
      const res = await fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to submit form");

      // Download returned PDF
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeTitle = (payload._form_title || "Form").replace(/[^a-z0-9\-_. ]+/gi, "_");
      a.download = safeTitle + ".pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      // Optional: show a gentle success message inline
      let note = form.querySelector(".emb-success-note");
      if (!note) {
        note = document.createElement("div");
        note.className = "emb-success-note";
        note.style.marginTop = "1rem";
        note.style.fontSize = "0.95rem";
        note.style.lineHeight = "1.4";
        note.style.border = "1px solid #ddd";
        note.style.padding = "0.75rem 1rem";
      }
      note.textContent = "Thanks! Your form was submitted. A copy has been emailed to our team and downloaded to your device.";
      form.appendChild(note);
    } catch (err){
      console.error(err);
      alert("Sorry, there was an error submitting the form. Please try again.");
    } finally {
      if (submitBtn) submitBtn.textContent = originalText || "Submit";
    }
  }

  // Delegate submit events
  document.addEventListener("submit", function(e){
    const form = e.target;
    if (form && form.classList.contains("emb-auto-pdf")) {
      handleSubmit(e);
    }
  }, true);
})();
