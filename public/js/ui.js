// 🟩🟩🟩 UI CONTROL 🟩🟩🟩

export function togglePanel() {
  const panel = document.getElementById("createPanel");

  if (!panel) {
    console.log("❌ panel not found");
    return;
  }

  panel.classList.toggle("active");
}

// 🟩🟩🟩 FORM BUILDER 🟩🟩🟩

export function handleTypeClick(type) {
  console.log("🎯 selected:", type);

  // ALL FORMS
  const beat = document.getElementById("beatForm");
  const sample = document.getElementById("sampleForm");
  const pack = document.getElementById("packForm");

  // ❌ hide all
  if (beat) beat.style.display = "none";
  if (sample) sample.style.display = "none";
  if (pack) pack.style.display = "none";

  // ✅ show selected
  if (type === "beat" && beat) {
    beat.style.display = "flex";
  }

  if (type === "sample" && sample) {
    sample.style.display = "flex";
  }

  if (type === "pack" && pack) {
    pack.style.display = "flex";
  }
}

// 🎧 AUDIO PREVIEW
const audioInput = document.getElementById("beatAudioInput");
const audioPreview = document.getElementById("beatPreview");

if (audioInput && audioPreview) {
  audioInput.addEventListener("change", () => {
    const file = audioInput.files[0];

    if (file) {
      audioPreview.src = URL.createObjectURL(file);
      audioPreview.style.display = "block";
    }
  });
}


// 🖼️ COVER PREVIEW
const coverInput = document.getElementById("coverInput");
const coverPreview = document.getElementById("coverPreview");

if (coverInput && coverPreview) {
  coverInput.addEventListener("change", () => {
    const file = coverInput.files[0];

    if (file) {
      coverPreview.src = URL.createObjectURL(file);
      coverPreview.style.display = "block";
    }
  });
}
