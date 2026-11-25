// field-notes.js
//   * a "Show More / Show Less" button that collapses most of the Field panel (hazards, screens, Protect, Helping Hand ...)
//   * a "Battle Notes" panel above Import / Export. Type in the small box, or click the "Battle Notes" title to open a big editor.
// Load AFTER jQuery (and after trainer-party.js is fine). Needs no changes to the HTML.
$(function () {
  var COLLAPSE_KEY = "fieldCollapsed";
  var NOTES_KEY = "battleNotes";

  // ---------- helpers ----------
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  // Find the panel whose heading text is exactly `title` (a <legend>/<h*> inside a <fieldset>/<div>)
  function findPanel(title) {
    var $h = $("legend, h1, h2, h3, h4, h5, b, strong, span, div").filter(function () {
      return $(this).children().length === 0 && $.trim($(this).text()) === title;
    }).last();
    if (!$h.length) return null;
    var $panel = $h.closest("fieldset");
    if (!$panel.length) $panel = $h.parent();
    return { $panel: $panel, $heading: $h };
  }

  $("<style>")
    .text(
      ".fn-hide { display: none !important; }" +
      "#fieldToggle { display: block; width: 100%; margin: 6px 0; cursor: pointer; font-size: 12px; }" +
      "#battleNotes { float: none !important; clear: both; display: block; margin-left: auto; margin-right: auto; }" +
      "#battleNotes legend { cursor: pointer; }" +
      "#battleNotes legend:hover { text-decoration: underline; }" +
      "#battleNotes textarea { width: 100%; box-sizing: border-box; height: 90px; resize: vertical; }" +
      "#bnOverlay { position: fixed; inset: 0; background: rgba(0,0,0,.65); z-index: 99999; display: none;" +
      "  align-items: center; justify-content: center; }" +
      "#bnOverlay.open { display: flex; }" +
      "#bnModal { background: #2b2b2b; color: #eee; border: 1px solid #666; border-radius: 8px; padding: 12px;" +
      "  width: min(900px, 92vw); height: min(80vh, 700px); display: flex; flex-direction: column; box-sizing: border-box; }" +
      "#bnModal .bn-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; font-size: 16px; }" +
      "#bnModal textarea { flex: 1; width: 100%; box-sizing: border-box; resize: none; background: #1d1d1d; color: #eee;" +
      "  border: 1px solid #666; padding: 8px; font-size: 14px; font-family: inherit; }"
    )
    .appendTo("head");

  // ---------- 1. collapsible Field panel ----------
  var field = findPanel("Field");
  if (field) {
    var $fp = field.$panel;

    // Everything below the weather/terrain/rooms/gravity rows: per-side hazards, screens and one-turn effects.
    var ids = [
      "srL", "srR", "steelsurgeL", "steelsurgeR", "vinelashL", "vinelashR", "wildfireL", "wildfireR",
      "cannonadeL", "cannonadeR", "volcalithL", "volcalithR", "gscSpikesL", "gscSpikesR",
      "reflectL", "reflectR", "lightScreenL", "lightScreenR", "protectL", "protectR",
      "leechSeedL", "leechSeedR", "nightmareL", "nightmareR", "saltCureL", "saltCureR",
      "foresightL", "foresightR", "chargeL", "chargeR", "helpingHandL", "helpingHandR",
      "tailwindL", "tailwindR", "flowerGiftL", "flowerGiftR", "powerTrickL", "powerTrickR",
      "steelySpiritL", "steelySpiritR", "friendGuardL", "friendGuardR", "auroraVeilL", "auroraVeilR",
      "batteryL", "batteryR", "powerSpotL", "powerSpotR", "switchingL", "switchingR"
    ];

    var $targets = $();
    function addTarget($el) { $targets = $targets.add($el); }
    ids.forEach(function (id) {
      addTarget($fp.find("#" + id));
      addTarget($fp.find("label[for='" + id + "']"));
    });
    $fp.find("input[name='spikesL'], input[name='spikesR']").each(function () {
      addTarget($(this));
      if (this.id) addTarget($fp.find("label[for='" + this.id + "']"));
    });

    if ($targets.length) {
      var fpEl = $fp[0];

      function applyCollapse() {
        $fp.find(".fn-hide").removeClass("fn-hide");
        $targets.addClass("fn-hide");
        // also hide wrappers (button groups, rows) that have nothing visible left in them
        var changed = true;
        while (changed) {
          changed = false;
          $targets.add($fp.find(".fn-hide")).each(function () {
            var p = this.parentNode;
            if (!p || p === fpEl || p.nodeType !== 1 || $(p).hasClass("fn-hide")) return;
            var $kids = $(p).children().not("legend, #fieldToggle");
            if ($kids.length && $kids.length === $kids.filter(".fn-hide").length &&
                $.trim($(p).clone().children().remove().end().text()) === "") {
              $(p).addClass("fn-hide");
              changed = true;
            }
          });
        }
      }
      function removeCollapse() { $fp.find(".fn-hide").removeClass("fn-hide"); }

      // Place the button right above the first hidden control (at the top-level child of the panel)
      var $first = $targets.first();
      var anchor = $first[0];
      while (anchor.parentNode && anchor.parentNode !== fpEl) anchor = anchor.parentNode;
      var $btn = $('<button type="button" id="fieldToggle"></button>');
      if (anchor && anchor.parentNode === fpEl) $btn.insertBefore(anchor); else $btn.appendTo($fp);

      var collapsed = lsGet(COLLAPSE_KEY) === "1";
      function render() {
        if (collapsed) { applyCollapse(); $btn.text("Show More"); }
        else { removeCollapse(); $btn.text("Show Less"); }
      }
      $btn.on("click", function () {
        collapsed = !collapsed;
        lsSet(COLLAPSE_KEY, collapsed ? "1" : "0");
        render();
      });
      render();
    }
  }

  // ---------- 2. Battle Notes above Import / Export ----------
  var ie = findPanel("Import / Export");
  if (ie) {
    var $ref = ie.$panel;
    var tag = $ref[0].tagName.toLowerCase();
    var $notes, $legend;
    if (tag === "fieldset") {
      $notes = $('<fieldset id="battleNotes"></fieldset>').attr("class", $ref.attr("class") || "");
      $legend = $('<legend title="Click to open a larger editor">Battle Notes</legend>')
        .attr("class", ie.$heading.attr("class") || "");
    } else {
      $notes = $('<div id="battleNotes"></div>').attr("class", $ref.attr("class") || "");
      $legend = $('<h2 title="Click to open a larger editor" style="cursor:pointer">Battle Notes</h2>');
    }
    var $small = $('<textarea id="battleNotesSmall" spellcheck="false" placeholder="Notes..."></textarea>');
    $notes.append($legend, $small).insertBefore($ref);

    // big editor
    var $big = $('<textarea id="battleNotesBig" spellcheck="false"></textarea>');
    var $close = $('<button type="button">Close</button>');
    var $overlay = $('<div id="bnOverlay"><div id="bnModal"><div class="bn-head"><span>Battle Notes</span></div></div></div>');
    $overlay.find(".bn-head").append($close);
    $overlay.find("#bnModal").append($big);
    $overlay.appendTo("body");

    var saved = lsGet(NOTES_KEY) || "";
    $small.val(saved); $big.val(saved);

    function sync(val, from) {
      if (from !== "small") $small.val(val);
      if (from !== "big") $big.val(val);
      lsSet(NOTES_KEY, val);
    }
    $small.on("input", function () { sync(this.value, "small"); });
    $big.on("input", function () { sync(this.value, "big"); });

    function openBig() { $overlay.addClass("open"); $big.focus(); }
    function closeBig() { $overlay.removeClass("open"); }
    $legend.on("click", openBig);
    $close.on("click", closeBig);
    $overlay.on("mousedown", function (e) { if (e.target === this) closeBig(); });
    $(document).on("keydown", function (e) { if (e.key === "Escape" && $overlay.hasClass("open")) closeBig(); });
  }
});
