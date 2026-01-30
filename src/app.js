// ==============================
      // Configuration & State
      // ==============================
      const AUTH_TOKEN_KEY = "javian_auth_token";
      let isEditMode = false;
      let currentConfig = null;
      let originalConfig = null;
      let itemModalState = { type: null, mode: null, target: null };

      // ==============================
      // Utility Functions
      // ==============================
      function generateId() {
        return (
          Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
        );
      }

      function isValidUrlForNavigation(url) {
        const trimmed = (url || "").trim();
        return trimmed && trimmed !== "#";
      }

      function navigateToUrl(url) {
        const trimmed = (url || "").trim();
        if (!isValidUrlForNavigation(trimmed)) {
          showToast("未设置链接", "info");
          return;
        }
        window.open(trimmed, "_blank", "noopener,noreferrer");
      }

      function closeItemModal() {
        const modal = document.getElementById("itemModal");
        if (!modal) return;
        modal.classList.add("hidden");
        document.getElementById("siteIconPickerPopup")?.classList.add("hidden");
        document.getElementById("socialIconPickerPopup")?.classList.add("hidden");
        itemModalState = { type: null, mode: null, target: null };
      }

      function setIconPreview(previewEl, classValue) {
        if (!previewEl) return;
        const klass = (classValue || "").trim() || "fas fa-link";
        previewEl.className = klass;
      }

      function setImagePreview(previewEl, url) {
        if (!previewEl) return;
        const src = (url || "").trim();
        previewEl.src = src;
        previewEl.classList.toggle("hidden", !src);
      }

      function fillSiteModal(target) {
        const titleInput = document.getElementById("siteModalTitle");
        const descInput = document.getElementById("siteModalDescription");
        const urlInput = document.getElementById("siteModalUrl");
        const iconInput = document.getElementById("siteModalIcon");
        const iconTypeSelect = document.getElementById("siteModalIconType");
        const imageInput = document.getElementById("siteModalImage");
        const modalIconWrap = document.getElementById("siteModalIconWrap");
        const modalImageWrap = document.getElementById("siteModalImageWrap");
        const accentInput = document.getElementById("siteModalAccent");
        const preview = document.getElementById("siteModalIconPreview");
        const imagePreview = document.getElementById("siteModalImagePreview");

        const title =
          target?.querySelector('[data-field="title"]')?.textContent?.trim() ||
          "";
        const description =
          target?.querySelector('[data-field="description"]')?.textContent?.trim() ||
          "";
        const url = target?.dataset?.url || "#";
        const icon =
          target?.querySelector('[data-field="icon"] i')?.className?.trim() ||
          "fas fa-link";
        const image =
          target?.querySelector('[data-field="icon"] img')?.getAttribute?.("src") ||
          "";
        const accent = !!target
          ?.querySelector('[data-field="icon"]')
          ?.classList?.contains("accent");

        if (titleInput) titleInput.value = title;
        if (descInput) descInput.value = description;
        if (urlInput) urlInput.value = url;
        if (iconInput) iconInput.value = icon;
        if (imageInput) imageInput.value = image;
        if (accentInput) accentInput.checked = accent;
        setIconPreview(preview, icon);
        setImagePreview(imagePreview, image);

        if (iconInput) {
          iconInput.oninput = () => setIconPreview(preview, iconInput.value);
        }

        const detectedType = (image || "").trim() ? "image" : "icon";
        if (iconTypeSelect) iconTypeSelect.value = detectedType;
        if (modalIconWrap && modalImageWrap) {
          if ((iconTypeSelect?.value || detectedType) === "image") {
            modalIconWrap.classList.add("hidden");
            modalImageWrap.classList.remove("hidden");
          } else {
            modalImageWrap.classList.add("hidden");
            modalIconWrap.classList.remove("hidden");
          }
        }

        if (imageInput) {
          imageInput.oninput = () =>
            setImagePreview(imagePreview, imageInput.value);
        }
      }

      function fillSocialModal(target) {
        const typeSelect = document.getElementById("socialModalType");
        const urlInput = document.getElementById("socialModalUrl");
        const iconInput = document.getElementById("socialModalIcon");
        const imgInput = document.getElementById("socialModalImage");
        const iconWrap = document.getElementById("socialModalIconWrap");
        const imgWrap = document.getElementById("socialModalImageWrap");
        const preview = document.getElementById("socialModalIconPreview");
        const imgPreview = document.getElementById("socialModalImagePreview");

        const type = target?.dataset?.type || "icon";
        const href = target?.getAttribute?.("href") || "#";
        const icon =
          target?.querySelector("i")?.className?.trim() || "fas fa-link";
        const image = target?.querySelector("img")?.getAttribute("src") || "";

        if (typeSelect) typeSelect.value = type;
        if (urlInput) urlInput.value = href;
        if (iconInput) iconInput.value = icon;
        if (imgInput) imgInput.value = image;
        setImagePreview(imgPreview, image);

        const applyType = () => {
          const current = typeSelect?.value || "icon";
          if (current === "image") {
            iconWrap?.classList.add("hidden");
            imgWrap?.classList.remove("hidden");
          } else {
            imgWrap?.classList.add("hidden");
            iconWrap?.classList.remove("hidden");
          }
        };

        applyType();
        if (typeSelect) typeSelect.onchange = applyType;

        setIconPreview(preview, icon);
        if (iconInput) {
          iconInput.oninput = () => setIconPreview(preview, iconInput.value);
        }

        if (imgInput) {
          imgInput.oninput = () => setImagePreview(imgPreview, imgInput.value);
        }
      }

      async function uploadFileToR2(file, type) {
        const token = getToken?.();
        if (!token) {
          throw new Error("NOT_AUTHENTICATED");
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        const res = await fetch("/api/upload", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data?.error || "UPLOAD_FAILED");
        }
        return data.url;
      }

      let itemModalUiWired = false;
      function wireItemModalUi() {
        if (itemModalUiWired) return;
        itemModalUiWired = true;

        const siteIconType = document.getElementById("siteModalIconType");
        const siteIconWrap = document.getElementById("siteModalIconWrap");
        const siteImageWrap = document.getElementById("siteModalImageWrap");
        const sitePickerBtn = document.getElementById("siteIconPickerBtn");
        const sitePickerPopup = document.getElementById("siteIconPickerPopup");
        const sitePickerGrid = document.getElementById("siteIconPickerGrid");
        const siteIconInput = document.getElementById("siteModalIcon");
        const siteIconPreview = document.getElementById("siteModalIconPreview");
        const siteImageInput = document.getElementById("siteModalImage");
        const siteImagePreview = document.getElementById("siteModalImagePreview");
        const siteImageUploadBtn = document.getElementById(
          "siteModalImageUploadBtn",
        );
        const siteImageFile = document.getElementById("siteModalImageFile");

        const applySiteIconType = () => {
          const current = siteIconType?.value || "icon";
          if (current === "image") {
            siteIconWrap?.classList.add("hidden");
            siteImageWrap?.classList.remove("hidden");
          } else {
            siteImageWrap?.classList.add("hidden");
            siteIconWrap?.classList.remove("hidden");
          }
          sitePickerPopup?.classList.add("hidden");
        };

        siteIconType?.addEventListener("change", applySiteIconType);

        sitePickerBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          sitePickerPopup?.classList.toggle("hidden");
        });

        sitePickerGrid?.addEventListener("click", (e) => {
          const btn = e.target.closest?.(".icon-pick-btn");
          if (!btn) return;
          e.preventDefault();
          const iconClass = btn.dataset.icon || "fas fa-link";
          if (siteIconInput) siteIconInput.value = iconClass;
          setIconPreview(siteIconPreview, iconClass);
          if (siteIconType) siteIconType.value = "icon";
          applySiteIconType();
        });

        siteImageUploadBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          siteImageFile?.click();
        });

        siteImageFile?.addEventListener("change", async () => {
          const file = siteImageFile.files?.[0];
          if (!file) return;
          try {
            showToast("正在上传...", "info");
            const url = await uploadFileToR2(file, "siteicon");
            if (siteImageInput) siteImageInput.value = url;
            setImagePreview(siteImagePreview, url);
            if (siteIconType) siteIconType.value = "image";
            applySiteIconType();
            showToast("上传成功", "success");
          } catch {
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("READ_FAILED"));
                reader.readAsDataURL(file);
              });
              if (typeof dataUrl === "string") {
                if (siteImageInput) siteImageInput.value = dataUrl;
                setImagePreview(siteImagePreview, dataUrl);
                if (siteIconType) siteIconType.value = "image";
                applySiteIconType();
                showToast("已使用本地图片预览（未上传）", "info");
              }
            } catch {
              showToast("上传失败", "error");
            }
          } finally {
            siteImageFile.value = "";
          }
        });

        const socialType = document.getElementById("socialModalType");
        const socialPickerBtn = document.getElementById("socialIconPickerBtn");
        const socialPickerPopup = document.getElementById("socialIconPickerPopup");
        const socialPickerGrid = document.getElementById("socialIconPickerGrid");
        const socialIconInput = document.getElementById("socialModalIcon");
        const socialIconPreview = document.getElementById("socialModalIconPreview");
        const socialImageInput = document.getElementById("socialModalImage");
        const socialImagePreview = document.getElementById("socialModalImagePreview");
        const socialImageUploadBtn = document.getElementById(
          "socialModalImageUploadBtn",
        );
        const socialImageFile = document.getElementById("socialModalImageFile");

        socialPickerBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          socialPickerPopup?.classList.toggle("hidden");
        });

        socialPickerGrid?.addEventListener("click", (e) => {
          const btn = e.target.closest?.(".icon-pick-btn");
          if (!btn) return;
          e.preventDefault();
          const iconClass = btn.dataset.icon || "fas fa-link";
          if (socialIconInput) socialIconInput.value = iconClass;
          setIconPreview(socialIconPreview, iconClass);
          if (socialType) {
            socialType.value = "icon";
            socialType.dispatchEvent(new Event("change"));
          }
          socialPickerPopup?.classList.add("hidden");
        });

        socialImageUploadBtn?.addEventListener("click", (e) => {
          e.preventDefault();
          socialImageFile?.click();
        });

        socialImageFile?.addEventListener("change", async () => {
          const file = socialImageFile.files?.[0];
          if (!file) return;
          try {
            showToast("正在上传...", "info");
            const url = await uploadFileToR2(file, "socialicon");
            if (socialImageInput) socialImageInput.value = url;
            setImagePreview(socialImagePreview, url);
            if (socialType) {
              socialType.value = "image";
              socialType.dispatchEvent(new Event("change"));
            }
            showToast("上传成功", "success");
          } catch {
            try {
              const reader = new FileReader();
              const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(new Error("READ_FAILED"));
                reader.readAsDataURL(file);
              });
              if (typeof dataUrl === "string") {
                if (socialImageInput) socialImageInput.value = dataUrl;
                setImagePreview(socialImagePreview, dataUrl);
                if (socialType) {
                  socialType.value = "image";
                  socialType.dispatchEvent(new Event("change"));
                }
                showToast("已使用本地图片预览（未上传）", "info");
              }
            } catch {
              showToast("上传失败", "error");
            }
          } finally {
            socialImageFile.value = "";
          }
        });

        document.addEventListener("click", (e) => {
          const t = e.target;
          if (
            sitePickerBtn &&
            sitePickerPopup &&
            !sitePickerBtn.contains(t) &&
            !sitePickerPopup.contains(t)
          ) {
            sitePickerPopup.classList.add("hidden");
          }
          if (
            socialPickerBtn &&
            socialPickerPopup &&
            !socialPickerBtn.contains(t) &&
            !socialPickerPopup.contains(t)
          ) {
            socialPickerPopup.classList.add("hidden");
          }
        });
      }

      function openItemModal(type, { mode, target } = {}) {
        const modal = document.getElementById("itemModal");
        if (!modal) return;

        itemModalState = { type, mode: mode || "edit", target: target || null };

        const titleEl = document.getElementById("itemModalTitle");
        const siteFields = document.getElementById("itemModalSiteFields");
        const socialFields = document.getElementById("itemModalSocialFields");

        siteFields?.classList.add("hidden");
        socialFields?.classList.add("hidden");

        if (type === "site") {
          if (titleEl)
            titleEl.textContent =
              itemModalState.mode === "create" ? "添加站点" : "编辑站点";
          siteFields?.classList.remove("hidden");
          fillSiteModal(target);
        }

        if (type === "social") {
          if (titleEl)
            titleEl.textContent =
              itemModalState.mode === "create"
                ? "添加社交链接"
                : "编辑社交链接";
          socialFields?.classList.remove("hidden");
          fillSocialModal(target);
        }

        modal.classList.remove("hidden");
        modal.querySelector("input,textarea,select")?.focus();
      }

      function createSiteCardEl({ title, description, url, icon, accent, iconType, image }) {
        const el = document.createElement("div");
        el.className =
          "group block p-5 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 wobble-hover relative";
        el.setAttribute("data-editable", "site");
        el.setAttribute("data-id", generateId());
        el.setAttribute("data-url", (url || "#").trim() || "#");
        el.setAttribute("role", "link");
        el.setAttribute("tabindex", "0");

        const iconClass = (icon || "fas fa-link").trim() || "fas fa-link";
        const accentClass = accent ? "accent" : "";
        const iconMode =
          (iconType || "").trim() || ((image || "").trim() ? "image" : "icon");
        const imageUrl = (image || "").trim();
        const iconHtml =
          iconMode === "image" && imageUrl
            ? `<img alt="Site" class="w-6 h-6 rounded-full object-cover opacity-80" src="${imageUrl}" data-field="image" />`
            : `<i class="${iconClass}"></i>`;

        el.innerHTML = `
          <div class="flex justify-between items-start mb-3">
            <h3 class="font-bold text-lg group-hover:opacity-80 transition-colors heading" data-field="title">${title}</h3>
            <div class="site-card-icon ${accentClass} w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]" data-field="icon">
              ${iconHtml}
            </div>
          </div>
          <p class="text-xs font-light" style="color: var(--text-muted)" data-field="description">${description || ""}</p>
          <button class="edit-delete-btn edit-control hidden absolute right-2 top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" onclick="deleteEditableItem(this)">×</button>
        `;

        if (isEditMode) {
          el.classList.add("editable-active");
          el.querySelectorAll(".edit-delete-btn").forEach((btn) => btn.classList.remove("hidden"));
        }
        return el;
      }

      function updateSiteCardEl(target, { title, description, url, icon, accent, iconType, image }) {
        target.dataset.url = (url || "#").trim() || "#";
        target.setAttribute("role", "link");
        target.setAttribute("tabindex", "0");

        const titleEl = target.querySelector('[data-field="title"]');
        const descEl = target.querySelector('[data-field="description"]');
        const iconWrap = target.querySelector('[data-field="icon"]');
        const iconMode =
          (iconType || "").trim() || ((image || "").trim() ? "image" : "icon");
        const imageUrl = (image || "").trim();

        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description || "";
        if (iconWrap) {
          if (iconMode === "image" && imageUrl) {
            iconWrap.querySelector("i")?.remove();
            let img = iconWrap.querySelector("img");
            if (!img) {
              img = document.createElement("img");
              img.className = "w-6 h-6 rounded-full object-cover opacity-80";
              img.setAttribute("data-field", "image");
              img.alt = "Site";
              iconWrap.appendChild(img);
            }
            img.src = imageUrl;
          } else {
            iconWrap.querySelector("img")?.remove();
            let iconEl = iconWrap.querySelector("i");
            if (!iconEl) {
              iconEl = document.createElement("i");
              iconWrap.appendChild(iconEl);
            }
            iconEl.className = (icon || "fas fa-link").trim();
          }
        }
        if (iconWrap) {
          if (accent) iconWrap.classList.add("accent");
          else iconWrap.classList.remove("accent");
        }
      }

      function insertNewSiteCard(el) {
        const container = document.getElementById("sitesContainer");
        if (!container) return;
        const addBtn = container.querySelector(".edit-add-btn");
        if (addBtn) container.insertBefore(el, addBtn);
        else container.appendChild(el);
      }

      function createSocialLinkEl({ type, href, icon, image }) {
        const a = document.createElement("a");
        a.className =
          "social-icon w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm relative";
        a.href = (href || "#").trim() || "#";
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.setAttribute("data-editable", "social");
        a.setAttribute("data-id", "new-" + generateId());
        a.setAttribute("data-type", type || "icon");

        if ((type || "icon") === "image") {
          const src = (image || "").trim();
          a.innerHTML = `
            <img alt="Social" class="w-5 h-5 rounded-full object-cover opacity-80" src="${src}" data-field="image" />
            <button class="edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center" onclick="deleteEditableItem(this)">×</button>
          `;
        } else {
          a.innerHTML = `
            <i class="${(icon || "fas fa-link").trim()}" data-field="icon"></i>
            <button class="edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center" onclick="deleteEditableItem(this)">×</button>
          `;
        }

        if (isEditMode) {
          a.classList.add("editable-active");
          a.querySelectorAll(".edit-delete-btn").forEach((btn) => btn.classList.remove("hidden"));
        }
        return a;
      }

      function updateSocialLinkEl(target, { type, href, icon, image }) {
        target.dataset.type = type || "icon";
        target.setAttribute("href", (href || "#").trim() || "#");
        target.target = "_blank";
        target.rel = "noopener noreferrer";

        const delBtn = target.querySelector(".edit-delete-btn");

        if ((type || "icon") === "image") {
          let img = target.querySelector("img");
          if (!img) {
            target.querySelector("i")?.remove();
            img = document.createElement("img");
            img.className = "w-5 h-5 rounded-full object-cover opacity-80";
            img.setAttribute("data-field", "image");
            img.alt = "Social";
            target.insertBefore(img, delBtn || null);
          }
          img.src = (image || "").trim();
          return;
        }

        let i = target.querySelector("i");
        if (!i) {
          target.querySelector("img")?.remove();
          i = document.createElement("i");
          i.setAttribute("data-field", "icon");
          target.insertBefore(i, delBtn || null);
        }
        i.className = (icon || "fas fa-link").trim();
      }

      function insertNewSocialLink(el) {
        const container = document.getElementById("socialLinksContainer");
        if (!container) return;
        const addBtn = container.querySelector(".edit-add-btn");
        if (addBtn) container.insertBefore(el, addBtn);
        else container.appendChild(el);
      }

      function handleItemModalSave(event) {
        event?.preventDefault?.();

        if (itemModalState.type === "site") {
          const title =
            document.getElementById("siteModalTitle")?.value?.trim() || "";
          const description =
            document.getElementById("siteModalDescription")?.value?.trim() || "";
          const url =
            document.getElementById("siteModalUrl")?.value?.trim() || "#";
          const iconType =
            document.getElementById("siteModalIconType")?.value || "icon";
          const icon =
            document.getElementById("siteModalIcon")?.value?.trim() ||
            "fas fa-link";
          const image =
            document.getElementById("siteModalImage")?.value?.trim() || "";
          const accent = !!document.getElementById("siteModalAccent")?.checked;

          if (!title) {
            showToast("请填写标题", "error");
            return;
          }

          if (itemModalState.mode === "create") {
            const el = createSiteCardEl({ title, description, url, icon, accent, iconType, image });
            insertNewSiteCard(el);
            showToast("已添加站点", "success");
          } else if (itemModalState.target) {
            updateSiteCardEl(itemModalState.target, {
              title,
              description,
              url,
              icon,
              iconType,
              image,
              accent,
            });
            showToast("已更新站点", "success");
          }

          closeItemModal();
          return;
        }

        if (itemModalState.type === "social") {
          const type = document.getElementById("socialModalType")?.value || "icon";
          const href =
            document.getElementById("socialModalUrl")?.value?.trim() || "#";
          const icon =
            document.getElementById("socialModalIcon")?.value?.trim() ||
            "fas fa-link";
          const image =
            document.getElementById("socialModalImage")?.value?.trim() || "";

          if (itemModalState.mode === "create") {
            const el = createSocialLinkEl({ type, href, icon, image });
            insertNewSocialLink(el);
            showToast("已添加社交链接", "success");
          } else if (itemModalState.target) {
            updateSocialLinkEl(itemModalState.target, { type, href, icon, image });
            showToast("已更新社交链接", "success");
          }

          closeItemModal();
        }
      }

      // ==============================
      // Load Config from KV
      // ==============================
      async function loadConfig() {
        try {
          const res = await fetch("/api/config");
          if (res.ok) {
            currentConfig = await res.json();
            renderConfig(currentConfig);
          }
        } catch (error) {
          console.log("Config API not available, using empty state");
        }
      }

      // ==============================
      // Render Config to DOM
      // ==============================
      function renderConfig(config) {
        if (!config) return;

        // Render timeline
        if (config.timeline && config.timeline.length > 0) {
          renderTimeline(config.timeline);
        }

        // Render tags
        if (config.tags && config.tags.length > 0) {
          renderTags(config.tags);
        }

        // Render sites
        if (config.sites && config.sites.length > 0) {
          renderSites(config.sites);
        }

        // Render info
        if (config.info) {
          const locationEl = document.querySelector('[data-field="location"]');
          const statusEl = document.querySelector('[data-field="status"]');
          if (locationEl && config.info.location)
            locationEl.textContent = config.info.location;
          if (statusEl && config.info.status)
            statusEl.textContent = config.info.status;
        }

        // Render images
        if (config.images) {
          if (config.images.avatar) {
            const avatarImg = document.querySelector(".avatar-container img");
            if (avatarImg) avatarImg.src = config.images.avatar;
          }
          if (config.images.background) {
            const bgImg = document.querySelector(".theme-bg-dark img");
            if (bgImg) bgImg.src = config.images.background;
          }
        }

        // Render social links
        if (config.socialLinks && config.socialLinks.length > 0) {
          renderSocialLinks(config.socialLinks);
        }
      }

      function renderTimeline(timeline) {
        const container = document.getElementById("timelineItems");
        if (!container) return;

        // Keep the add button
        const addBtn = container.querySelector(".edit-add-btn");
        container.innerHTML = "";
        if (addBtn) container.appendChild(addBtn);

        timeline.forEach((item, index) => {
          const isHighlight = index === 0; // First item is highlighted
          const div = document.createElement("div");
          div.className = `relative group fade-left-active delay-${(index + 1) * 100}`;
          div.setAttribute("data-editable", "timeline");
          div.setAttribute("data-id", item.id || generateId());

          const dotClass = isHighlight
            ? "timeline-dot absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full ring-4 ring-black/20 z-10 animate-pulse-glow"
            : "absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full bg-slate-500 group-hover:bg-white transition-colors z-10 ring-4 ring-black/20";

          const dateStyle = isHighlight
            ? "color: var(--accent-color)"
            : "color: var(--text-muted)";

          const dateClass = isHighlight
            ? "text-xs font-bold mb-1 tracking-wider opacity-80"
            : "text-xs mb-1 tracking-wider";

          div.innerHTML = `
            <div class="${dotClass}"></div>
            <div class="${dateClass}" style="${dateStyle}" data-field="date">${item.date}</div>
            <h4 class="text-sm font-semibold group-hover:opacity-80 transition-colors heading" data-field="title">${item.title}</h4>
            <button class="edit-delete-btn edit-control hidden absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" onclick="deleteEditableItem(this)">×</button>
          `;

          container.appendChild(div);
        });
      }

      function renderTags(tags) {
        const container = document.getElementById("tagsContainer");
        if (!container) return;

        const addBtn = container.querySelector(".edit-add-btn");
        container.innerHTML = "";

        tags.forEach((tag) => {
          const span = document.createElement("span");
          span.className =
            "tag px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-default wobble-hover relative";
          span.setAttribute("data-editable", "tag");
          span.innerHTML = `
            <span data-field="tag">${tag}</span>
            <button class="edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center" onclick="deleteEditableItem(this)">×</button>
          `;
          container.appendChild(span);
        });

        if (addBtn) container.appendChild(addBtn);
      }

      function renderSites(sites) {
        const container = document.getElementById("sitesContainer");
        if (!container) return;

        const addBtn = container.querySelector(".edit-add-btn");
        container.innerHTML = "";

        sites.forEach((site, index) => {
          const div = document.createElement("div");
          div.className = `group block p-5 rounded-2xl glass-panel hover:-translate-y-1 transition-transform duration-300 fade-enter-active delay-${(index + 3) * 100} wobble-hover relative`;
          div.setAttribute("data-editable", "site");
          div.setAttribute("data-id", site.id || generateId());
          div.setAttribute("data-url", site.url || site.href || "#");
          div.setAttribute("role", "link");
          div.setAttribute("tabindex", "0");

          const iconMode =
            (site.iconType || "").trim() ||
            ((site.image || "").trim() ? "image" : "icon");
          const imageUrl = (site.image || "").trim();

          const rawIcon = (site.icon || "").trim();
          const iconClass = rawIcon
            ? rawIcon.includes(" ")
              ? rawIcon
              : rawIcon.startsWith("fa-")
                ? `fas ${rawIcon}`
                : `fas fa-${rawIcon}`
            : "fas fa-link";

          const iconHtml =
            iconMode === "image" && imageUrl
              ? `<img alt="Site" class="w-6 h-6 rounded-full object-cover opacity-80" src="${imageUrl}" data-field="image" />`
              : `<i class="${iconClass}"></i>`;

          const accentClass = site.accent ? "accent" : "";

          div.innerHTML = `
            <div class="flex justify-between items-start mb-3">
              <h3 class="font-bold text-lg group-hover:opacity-80 transition-colors heading" data-field="title">${site.title}</h3>
              <div class="site-card-icon ${accentClass} w-9 h-9 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.1)]" data-field="icon">
                ${iconHtml}
              </div>
            </div>
            <p class="text-xs font-light" style="color: var(--text-muted)" data-field="description">${site.description || ""}</p>
            <button class="edit-delete-btn edit-control hidden absolute right-2 top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" onclick="deleteEditableItem(this)">×</button>
          `;

          container.appendChild(div);
        });

        if (addBtn) container.appendChild(addBtn);
      }

      function renderSocialLinks(socialLinks) {
        const container = document.getElementById("socialLinksContainer");
        if (!container) return;

        const addBtn = container.querySelector(".edit-add-btn");
        container.innerHTML = "";

        socialLinks.forEach((link) => {
          const a = document.createElement("a");
          a.className =
            "social-icon w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 backdrop-blur-sm relative";
          a.href = link.href || link.url || "#";
          a.target = "_blank";
          a.rel = "noopener noreferrer";
          a.setAttribute("data-editable", "social");
          a.setAttribute("data-id", link.id || generateId());
          a.setAttribute("data-type", link.type || "icon");

          if (link.type === "image" && link.image) {
            a.innerHTML = `
              <img alt="Social" class="w-5 h-5 rounded-full object-cover opacity-80" src="${link.image}" data-field="image" />
              <button class="edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center" onclick="deleteEditableItem(this)">×</button>
            `;
          } else {
            a.innerHTML = `
              <i class="${link.icon || "fas fa-link"}" data-field="icon"></i>
              <button class="edit-delete-btn hidden absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] items-center justify-center" onclick="deleteEditableItem(this)">×</button>
            `;
          }

          container.appendChild(a);
        });

        if (addBtn) container.appendChild(addBtn);
      }

      window.addSocialLink = function () {
        openItemModal("social", { mode: "create" });
      };

      function wireLinkInteractions() {
        const sitesContainer = document.getElementById("sitesContainer");
        const socialContainer = document.getElementById("socialLinksContainer");

        // Ensure existing social anchors open in new tab in view mode
        socialContainer?.querySelectorAll('a[data-editable="social"]').forEach((a) => {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        });

        sitesContainer?.addEventListener("click", (e) => {
          if (e.target.closest(".edit-delete-btn") || e.target.closest(".edit-add-btn")) {
            return;
          }

          const card = e.target.closest('[data-editable="site"]');
          if (!card) return;

          if (isEditMode) {
            openItemModal("site", { mode: "edit", target: card });
            return;
          }

          navigateToUrl(card.dataset.url);
        });

        sitesContainer?.addEventListener("keydown", (e) => {
          if (e.key !== "Enter") return;
          const card = e.target.closest?.('[data-editable="site"]');
          if (!card) return;

          if (isEditMode) {
            openItemModal("site", { mode: "edit", target: card });
            return;
          }

          navigateToUrl(card.dataset.url);
        });

        socialContainer?.addEventListener("click", (e) => {
          if (e.target.closest(".edit-delete-btn") || e.target.closest(".edit-add-btn")) {
            return;
          }

          const link = e.target.closest('a[data-editable="social"]');
          if (!link) return;

          if (isEditMode) {
            e.preventDefault();
            openItemModal("social", { mode: "edit", target: link });
            return;
          }

          const href = link.getAttribute("href") || "#";
          if (!isValidUrlForNavigation(href)) {
            e.preventDefault();
            showToast("未设置链接", "info");
          }
        });

        document.addEventListener("keydown", (e) => {
          if (e.key !== "Escape") return;
          const modal = document.getElementById("itemModal");
          if (modal && !modal.classList.contains("hidden")) {
            closeItemModal();
          }
        });
      }

      // Initialize once on page load
      document.addEventListener("DOMContentLoaded", () => {
        wireLinkInteractions();
        wireItemModalUi();

        // Always start with toolbar hidden; only show after entering edit mode.
        document.getElementById("editToolbar")?.classList.add("hidden");

        if (isAuthenticated()) {
          const authBtn = document.getElementById("authBtn");
          authBtn?.classList.add("authenticated");
          if (authBtn) authBtn.innerHTML = '<i class="fas fa-unlock"></i>';
        }
        loadConfig();
      });

      // ==============================
      // Theme Toggle Logic
      // ==============================
      const themeToggle = document.getElementById("themeToggle");
      const iconDark = document.querySelector(".theme-icon-dark");
      const iconHanddrawn = document.querySelector(".theme-icon-handdrawn");

      function setTheme(theme) {
        if (theme === "handdrawn") {
          document.documentElement.classList.add("theme-handdrawn");
          iconDark.classList.add("hidden");
          iconHanddrawn.classList.remove("hidden");
        } else {
          document.documentElement.classList.remove("theme-handdrawn");
          iconDark.classList.remove("hidden");
          iconHanddrawn.classList.add("hidden");
        }
        localStorage.setItem("theme", theme);
      }

      const savedTheme = localStorage.getItem("theme") || "dark";
      setTheme(savedTheme);

      themeToggle.addEventListener("click", () => {
        const currentTheme = document.documentElement.classList.contains(
          "theme-handdrawn",
        )
          ? "handdrawn"
          : "dark";
        const newTheme = currentTheme === "dark" ? "handdrawn" : "dark";
        setTheme(newTheme);
      });

      // ==============================
      // Clock Logic
      // ==============================
      function updateClock() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");
        const hours = String(now.getHours()).padStart(2, "0");
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");

        const timeString = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        const clockElement = document.getElementById("clock");
        const clockReflectionElement =
          document.getElementById("clock-reflection");

        if (clockElement) clockElement.textContent = timeString;
        if (clockReflectionElement)
          clockReflectionElement.textContent = timeString;
      }

      setInterval(updateClock, 1000);
      updateClock();

      // ==============================
      // Auth Functions
      // ==============================
      function getToken() {
        return localStorage.getItem(AUTH_TOKEN_KEY);
      }

      function isAuthenticated() {
        return !!getToken();
      }

      function openAuthModal() {
        if (isAuthenticated()) {
          // Already logged in, enable edit mode
          enableEditMode();
        } else {
          document.getElementById("authModal").classList.remove("hidden");
          document.getElementById("authPassword").focus();
        }
      }

      function closeAuthModal() {
        document.getElementById("authModal").classList.add("hidden");
        document.getElementById("authPassword").value = "";
        document.getElementById("authError").classList.add("hidden");
      }

      async function handleLogin() {
        const password = document.getElementById("authPassword").value;
        const errorEl = document.getElementById("authError");

        if (!password) {
          errorEl.textContent = "请输入密码";
          errorEl.classList.remove("hidden");
          return;
        }

        try {
          const res = await fetch("/api/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password }),
          });

          const data = await res.json();

          if (!res.ok) {
            errorEl.textContent = data.error || "密码错误";
            errorEl.classList.remove("hidden");
            return;
          }

          localStorage.setItem(AUTH_TOKEN_KEY, data.token);
          closeAuthModal();
          enableEditMode();
          showToast("登录成功，已进入编辑模式", "success");
        } catch (error) {
          errorEl.textContent = "网络错误，请重试";
          errorEl.classList.remove("hidden");
        }
      }

      function handleLogout() {
        localStorage.removeItem(AUTH_TOKEN_KEY);
        disableEditMode();
        document.getElementById("authBtn").classList.remove("authenticated");
        showToast("已退出登录", "info");
      }

      // ==============================
      // Edit Mode Functions
      // ==============================
      function enableEditMode() {
        isEditMode = true;
        originalConfig = currentConfig
          ? JSON.parse(JSON.stringify(currentConfig))
          : null;

        document.body.classList.add("edit-mode");
        document.getElementById("editToolbar").classList.remove("hidden");
        document.getElementById("authBtn").classList.add("authenticated");
        document.getElementById("authBtn").innerHTML =
          '<i class="fas fa-unlock"></i>';

        // Enable contenteditable on editable fields (site/social edited via modal)
        document.querySelectorAll("[data-field]").forEach((el) => {
          if (el.closest(".pointer-events-none")) return; // Skip reflection elements
          if (el.closest('[data-editable="site"],[data-editable="social"]')) return;
          el.contentEditable = "true";
          el.classList.add("editable-field");
        });

        // Show delete buttons
        document.querySelectorAll(".edit-delete-btn").forEach((btn) => {
          btn.classList.remove("hidden");
        });

        // Show add buttons
        document.querySelectorAll(".edit-add-btn").forEach((btn) => {
          btn.classList.remove("hidden");
        });

        // Add editable active class
        document.querySelectorAll("[data-editable]").forEach((el) => {
          el.classList.add("editable-active");
        });
      }

      function disableEditMode() {
        isEditMode = false;

        document.body.classList.remove("edit-mode");
        document.getElementById("editToolbar").classList.add("hidden");
        document.getElementById("authBtn").innerHTML =
          '<i class="fas fa-pen"></i>';

        // Disable contenteditable
        document.querySelectorAll("[data-field]").forEach((el) => {
          el.contentEditable = "false";
          el.classList.remove("editable-field");
        });

        // Hide delete buttons
        document.querySelectorAll(".edit-delete-btn").forEach((btn) => {
          btn.classList.add("hidden");
        });

        // Hide add buttons
        document.querySelectorAll(".edit-add-btn").forEach((btn) => {
          btn.classList.add("hidden");
        });

        // Remove editable active class
        document.querySelectorAll("[data-editable]").forEach((el) => {
          el.classList.remove("editable-active");
        });
      }

      function handleCancelEdit() {
        if (confirm("确定要取消编辑吗？未保存的更改将丢失。")) {
          // Reload the page to restore original content
          location.reload();
        }
      }

      // ==============================
      // Data Collection & Save
      // ==============================
      function collectEditedData() {
        const data = {
          timeline: [],
          sites: [],
          tags: [],
          info: {},
          images: {},
        };

        // Collect timeline data
        document
          .querySelectorAll('[data-editable="timeline"]')
          .forEach((el) => {
            const dateEl = el.querySelector('[data-field="date"]');
            const titleEl = el.querySelector('[data-field="title"]');
            if (dateEl && titleEl) {
              data.timeline.push({
                id: el.dataset.id || generateId(),
                date: dateEl.textContent.trim(),
                title: titleEl.textContent.trim(),
                highlight: el.classList.contains("timeline-highlight"),
              });
            }
          });

        // Collect site cards
        document.querySelectorAll('[data-editable="site"]').forEach((el) => {
          const titleEl = el.querySelector('[data-field="title"]');
          const descEl = el.querySelector('[data-field="description"]');
          const iconEl = el.querySelector('[data-field="icon"] i');
          const imageEl = el.querySelector('[data-field="icon"] img');
          const iconWrap = el.querySelector('[data-field="icon"]');
          if (titleEl) {
            const image = imageEl?.getAttribute?.("src") || "";
            const iconType = (image || "").trim() ? "image" : "icon";
            data.sites.push({
              id: el.dataset.id || generateId(),
              title: titleEl.textContent.trim(),
              description: descEl?.textContent.trim() || "",
              icon: iconEl?.className || "fas fa-link",
              image,
              iconType,
              url: el.dataset.url || el.href || "#",
              accent: !!iconWrap?.classList.contains("accent"),
            });
          }
        });

        // Collect tags
        document.querySelectorAll('[data-editable="tag"]').forEach((el) => {
          const tagEl = el.querySelector('[data-field="tag"]');
          const text = tagEl?.textContent.trim();
          if (text) {
            data.tags.push(text);
          }
        });

        // Collect info
        const locationEl = document.querySelector('[data-field="location"]');
        const statusEl = document.querySelector('[data-field="status"]');
        data.info = {
          location: locationEl?.textContent.trim() || "ShenZhen",
          status: statusEl?.textContent.trim() || "Currently employed",
        };

        // Collect images
        const avatarEl = document.querySelector('[data-field="avatar"]');
        const bgEl = document.querySelector('[data-field="background"]');
        data.images = {
          avatar: avatarEl?.src || "touxiang.jpg",
          background: bgEl?.src || "Background.webp",
        };

        // Collect social links
        data.socialLinks = [];
        document.querySelectorAll('[data-editable="social"]').forEach((el) => {
          const type = el.dataset.type || "icon";
          const href = el.getAttribute("href") || "#";
          let icon = "";
          let image = "";

          if (type === "image") {
            const imgEl = el.querySelector("img");
            if (imgEl) {
              image = imgEl.src;
            }
          } else {
            const iconEl = el.querySelector("i");
            if (iconEl) {
              icon = iconEl.className;
            }
          }

          data.socialLinks.push({
            id: el.dataset.id || generateId(),
            type: type,
            href: href,
            icon: icon,
            image: image,
          });
        });

        return data;
      }

      async function handleSave() {
        const token = getToken();
        if (!token) {
          showToast("请先登录", "error");
          return;
        }

        const data = collectEditedData();

        try {
          const res = await fetch("/api/config", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(data),
          });

          const result = await res.json();

          if (!res.ok) {
            if (res.status === 401) {
              handleLogout();
              showToast("登录已过期，请重新登录", "error");
            } else {
              showToast(result.error || "保存失败", "error");
            }
            return;
          }

          currentConfig = data;
          showToast("保存成功！", "success");
        } catch (error) {
          showToast("网络错误，请重试", "error");
        }
      }

      // ==============================
      // Image Upload
      // ==============================
      async function handleImageUpload(input, type) {
        const file = input.files[0];
        if (!file) return;

        const token = getToken();
        if (!token) {
          showToast("请先登录", "error");
          return;
        }

        const formData = new FormData();
        formData.append("file", file);
        formData.append("type", type);

        try {
          showToast("正在上传...", "info");

          const res = await fetch("/api/upload", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          });

          const data = await res.json();

          if (!res.ok) {
            showToast(data.error || "上传失败", "error");
            return;
          }

          // Update the image
          if (type === "avatar") {
            const avatarImg = document.querySelector(".avatar-container img");
            if (avatarImg) avatarImg.src = data.url;
          } else if (type === "background") {
            const bgImg = document.querySelector(".theme-bg-dark img");
            if (bgImg) bgImg.src = data.url;
          }

          showToast("上传成功！", "success");
        } catch (error) {
          showToast("网络错误，请重试", "error");
        }

        // Clear the input
        input.value = "";
      }

      // ==============================
      // Delete Functions
      // ==============================
      window.deleteEditableItem = function (button) {
        const item = button.closest("[data-editable]");
        if (item && confirm("确定要删除此项吗？")) {
          item.remove();
          showToast("已删除", "info");
        }
      };

      // ==============================
      // Add Functions
      // ==============================
      window.addTimelineItem = function () {
        const container = document.getElementById("timelineItems");
        const addBtn = container.querySelector(".edit-add-btn");
        const newId = generateId();

        const newItem = document.createElement("div");
        newItem.className = "relative group fade-left-active";
        newItem.setAttribute("data-editable", "timeline");
        newItem.setAttribute("data-id", newId);
        newItem.innerHTML = `
          <div class="absolute -left-[1.8rem] top-1.5 w-3 h-3 rounded-full bg-slate-500 group-hover:bg-white transition-colors z-10 ring-4 ring-black/20"></div>
          <div class="text-xs mb-1 tracking-wider editable-field" style="color: var(--text-muted)" data-field="date" contenteditable="true">YYYY.MM</div>
          <h4 class="text-sm font-semibold group-hover:opacity-80 transition-colors heading editable-field" data-field="title" contenteditable="true">新事件</h4>
          <button class="edit-delete-btn edit-control absolute -right-2 -top-2 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center" onclick="deleteEditableItem(this)">×</button>
        `;

        if (addBtn) {
          container.insertBefore(newItem, addBtn.nextSibling);
        } else {
          container.prepend(newItem);
        }
        newItem.classList.add("editable-active");
        showToast("已添加新事件", "success");
      };

      window.addSiteCard = function () {
        openItemModal("site", { mode: "create" });
      };

      window.addTag = function () {
        const container = document.getElementById("tagsContainer");
        const addBtn = container.querySelector(".edit-add-btn");

        const newTag = document.createElement("span");
        newTag.className =
          "tag px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-default wobble-hover relative";
        newTag.setAttribute("data-editable", "tag");
        newTag.innerHTML = `
          <span data-field="tag" class="editable-field" contenteditable="true">新标签</span>
          <button class="edit-delete-btn absolute -right-1 -top-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center" onclick="deleteEditableItem(this)">×</button>
        `;

        container.insertBefore(newTag, addBtn);
        newTag.classList.add("editable-active");
        showToast("已添加新标签", "success");
      };

      // Expose modal handlers for inline HTML attributes
      window.closeItemModal = closeItemModal;
      window.handleItemModalSave = handleItemModalSave;

      function showToast(message, type = "info") {
        // Create toast element
        const toast = document.createElement("div");
        toast.className = `fixed top-20 right-6 z-[200] px-4 py-3 rounded-xl shadow-lg backdrop-blur-md transition-all duration-300 transform translate-x-full`;

        const colors = {
          success: "bg-green-500/20 text-green-400 border border-green-500/30",
          error: "bg-red-500/20 text-red-400 border border-red-500/30",
          info: "bg-white/10 text-white border border-white/20",
        };

        toast.className += ` ${colors[type] || colors.info}`;
        toast.innerHTML = `<span class="text-sm font-medium">${message}</span>`;

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
          toast.classList.remove("translate-x-full");
        });

        // Remove after 3 seconds
        setTimeout(() => {
          toast.classList.add("translate-x-full");
          setTimeout(() => toast.remove(), 300);
        }, 3000);
      }

