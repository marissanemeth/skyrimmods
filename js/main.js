/**************************************************
 * Still need to implement:
 ** Filter by name (search), category, source, status, nsfw/sfw
 ** Compare to Modwatch??? (May not be feasible with this particular approach)
 **************************************************/

(function() {
    "use strict";

    function loadJSON(callback) {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open("GET", "js/data.json", true);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(xhr.responseText);
            }
        };
        xhr.send();
    }

    /**********
     * Function declarations: Element node utilities
     **********/
    function findNode(params) {
        let validNode = null;
        let nodeIterator = document.createNodeIterator(
            params.container, NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return NodeFilter.FILTER_ACCEPT;
                }
            }, false);
        let node = nodeIterator.root;

        if (params.returnAllNodes) {
            validNode = [];
        }

        while (node) {
            if (node.tagName.toLowerCase() === params.elem.toLowerCase()) {
                if (params.returnAllNodes) {
                    validNode.push(node);
                } else {
                    validNode = node;
                }
            }
            node = nodeIterator.nextNode();
        }

        return validNode;
    }

    function findAncestorSection(node) {
        while ((node = node.parentElement) && (node.tagName.toLowerCase() !== "section"));

        return node;
    }

    function insertChildNode(params) {
        let childNode = document.createElement(params.childNode);

        Object.keys(params.childAttr).forEach(function(key) {
            if (params.childAttr[key]) {
                childNode.setAttribute(key, params.childAttr[key]);
            }
        });
        childNode.innerHTML = params.contents;

        return childNode;
    }

    /**********
     * Function declarations: General utilities
     **********/
    function cleanName(name) {
        return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, ""); // strip special characters
    }

    function cleanMergeName(mergeName) {
        let cleanedName = cleanName(mergeName);
        cleanedName = cleanedName.substring(0, cleanedName.length - 4); // remove the .esp extension

        return cleanedName;
    }

    function checkBasicField(field) {
        if (field) {
            return `<div>${field}</div>`;
        } else {
            return "";
        }
    }

    function compareValues(key, order = "asc") {
        return function(a, b) {
            if (!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
                // property doesn't exist on either object
                return 0;
            }

            const varA = (typeof a[key] === 'string') ?
                a[key].toUpperCase() : a[key];
            const varB = (typeof b[key] === 'string') ?
                b[key].toUpperCase() : b[key];

            let comparison = 0;
            if (varA > varB) {
                comparison = 1;
            } else if (varA < varB) {
                comparison = -1;
            }
            return (
                (order == 'desc') ? (comparison * -1) : comparison
            );
        };
    }

    /**********
     * Function declarations: Data display
     **********/
    function getModAttributes(data, config, params) {
        const mods = data.mods;

        Object.keys(mods).forEach(function(key) {
            let files = mods[key].mergedFiles;
            let status = mods[key].status.toLowerCase();
            let category = mods[key].category;

            if (files !== undefined) {
                Object.keys(files).forEach(function(key2) {
                    if (!params.mergedFileContents[key2]) {
                        params.mergedFileContents[key2] = {};
                    }
                    if (!params.mergedFileContents[key2][mods[key].name]) {
                        params.mergedFileContents[key2][mods[key].name] = [];
                    }
                    params.mergedFileContents[key2][mods[key].name].push(files[key2]);
                });
            }

            if (status && config.validStatuses["enabled"].includes(status)) {
                params.modStats["enabled"]++;
            } else if (status && (config.validStatuses["disabled"].includes(status) || config.validStatuses["downloaded"].includes(status))) {
                params.modStats["disabled"]++;
            }

            if (category && !params.modCategories.includes(category)) {
                params.modCategories.push(category);
            }
        });

        return params;
    }

    function showLink(config, params) {
        let output = "";
        let maxWidth = Math.floor(Number(config.defaults["maxWidth"].substring(0, (config.defaults["maxWidth"].length - 3))) * 2);

        if (params.linkUrl) {
            output = `<a class="d-inline-block" href="${params.linkUrl}" style="max-width: ${maxWidth}rem;" title="${params.resultName}">${params.resultName}</a>`;
        } else {
            output = `<div style="max-width: ${maxWidth}rem;" title="${params.resultName}">${params.resultName}</div>`;
        }

        return output;
    }

    function showVersions(config, versions) {
        let output = "";
        let versionText = "";

        if (typeof versions === "object") {
            output = `<ul class="list-unstyled">`;

            Object.keys(versions).forEach(function(key) {
                versionText = key;
                if (versions[key]) {
                    versionText += `: ${versions[key]}`;
                }
                output += `<li class="text-truncate" style="max-width: ${config.defaults["maxWidth"]};" title="${versionText}">${versionText}</li>`;
            });

            output += `</ul>`;
        } else if (typeof versions === "string") {
            output = `<div class="text-truncate" style="max-width: ${config.defaults["maxWidth"]};" title="${versions}">${versions}</div>`;
        }

        return output;
    }

    function showStatus(config, status) {
        let output = "";

        if (config.validStatuses["enabled"].includes(status.toLowerCase())) {
            output = `<span class="badge badge-pill badge-success">${status}</span>`;
        } else if (config.validStatuses["disabled"].includes(status.toLowerCase())) {
            output = `<span class="badge badge-pill badge-danger">${status}</span>`;
        } else if (config.validStatuses["cannibalize"].includes(status.toLowerCase())) {
            output = `<span class="badge badge-pill badge-light">${status}</span>`;
        } else if (config.validStatuses["downloaded"].includes(status.toLowerCase())) {
            output = `<span class="badge badge-pill badge-secondary">${status}</span>`;
        } else if (status !== undefined) {
            output = `<span class="badge badge-pill badge-warning">${status}</span>`;
        }

        return output;
    }

    function showAssociatedMerges(config, merge) {
        let output = "";

        if (typeof merge === "object") {
            output = `<ul class="list-unstyled">`;

            Object.keys(merge).forEach(function(key) {
                output += `<li class="text-truncate" style="max-width: ${config.defaults["maxWidth"]};" title="${key}"><a id="modal-for-${cleanMergeName(key)}" data-dismiss="modal" data-toggle="modal" data-target="#modal-merges" href="#">${key}</a></li>`;
            });

            output += `</ul>`;
        }

        return output;
    }

    function showNavmeshToggle(navmesh) {
        let output = "";

        if (navmesh === "y") {
            output = `<span class="text-center navmesh-toggle">&check;</span>`;
        }

        return output;
    }

    function checkForMergedFileContents(merge) {
        if (typeof merge === "object") {
            return true;
        } else {
            return false;
        }
    }

    function showMergedFileAccordion(params) {
        let output = "";
        let merge = params.mergedFileContents[params.mergeName];
        let accordionId = `${params.childAttr["id"]}-details`;

        if (checkForMergedFileContents(merge)) {
            output += `<a data-toggle="collapse" href="#${accordionId}"> [&hellip;]</a>
                <div class="collapse" id="${accordionId}">${showMergedFileContents(params)}</div>`;
        }

        return output;
    }

    function showMergedFileContents(params) {
        let output = "";
        let merge = params.mergedFileContents[params.mergeName];

        if (checkForMergedFileContents(merge)) {
            output += `<ul>`;

            Object.keys(merge).forEach(function(key) {
                output += `<li>
                    <a id="modal-for-${cleanName(key)}" data-dismiss="modal" data-toggle="modal" data-target="#modal-mods" href="#">${key}</a>
                    <ul>`;
                output += merge[key][0].map((file) => `<li>${file}</li>`).join("");
                output += `</ul>
                    </li>`;
            });

            output += `</ul>`;
        }

        return output;
    }

    /**********
     * Function declarations: Modals
     **********/
    function refreshModalContents(config, params) {
        const pool = params.searchIn;
        const found = pool.find(function(item) {
            return item.name === params.find;
        });
        let modalTitleNode = document.getElementById(`modal-${params.modal}-title`);
        let modalContentNode = document.getElementById(`modal-${params.modal}-content`);
        let newModalTitle = "";
        let newModalContent = "";

        if (found) {

            if (params.modal === "mods") { // mod modal
                if (found.url) {
                    newModalTitle = `<a href="${found.url}">${found.name}</a>`;
                } else {
                    newModalTitle = found.name;
                }

                newModalContent = `<dl class="row">
                    <dt class="col-sm-3">Source:</dt>
                    <dd class="col-sm-9">${checkBasicField(found.source)}</dd>
                    <dt class="col-sm-3">Version(s):</dt>
                    <dd class="col-sm-9">${showVersions(config, found.versions)}</dd>
                    <dt class="col-sm-3">Category:</dt>
                    <dd class="col-sm-9">${checkBasicField(found.category)}</dd>
                    <dt class="col-sm-3">Merged to:</dt>
                    <dd class="col-sm-9">${showAssociatedMerges(config, found.mergedFiles)}</dd>
                    <dt class="col-sm-3">Status:</dt>
                    <dd class="col-sm-9">${showStatus(config, found.status)}</dd>
                    <dt class="col-sm-3">Comments:</dt>
                    <dd class="col-sm-9">${checkBasicField(found.comments)}</dd>
                    </dl>`;

            } else { // merge modal

                params.mergeName = found.name;
                let fileList = showMergedFileContents(params);
                newModalTitle = found.name;
                newModalContent = `<dl class="row">`;

                if (found.rebuildNavmeshOnMerge) {
                    newModalContent += `<dt class="col-sm-3">Rebuild navmesh after merge?:</dt>
                        <dd class="col-sm-9">${showNavmeshToggle(found.rebuildNavmeshOnMerge)}</dd>`;
                }
                if (fileList) {
                    newModalContent += `<dt class="col-sm-3">Merged files:</dt>
                        <dd class="col-sm-9">${fileList}</dd>`;
                }
                if (found.comments) {
                    newModalContent += `<dt class="col-sm-3">Comments:</dt>
                        <dd class="col-sm-9">${checkBasicField(found.comments)}</dd>`;
                }

                newModalContent += `</dl>`;

            }
        }

        modalTitleNode.innerHTML = newModalTitle;
        modalContentNode.innerHTML = newModalContent;

        return;
    }

    /**********
     * Function declarations: Search/filter/views
     **********/
    function updateQuery(data, config, params) {
        params.search = new URLSearchParams(document.location.search.substring(1));

        if (params.search.has("view") === false) {
            params.search.set("view", config.defaults["view"]);
        }
        if (params.search.has("offset") === false) {
            params.search.set("offset", config.defaults["offset"]);
        }
        if (params.search.has("show") === false) {
            params.search.set("show", config.defaults["show"]);
        }
        if (params.search.has("category") === false) {
            params.search.set("category", config.defaults["category"]);
        }
        if (params.search.has("source") === false) {
            params.search.set("source", config.defaults["source"]);
        }

        //console.log(`?view=${params.search.get("view")}&offset=${params.search.get("offset")}&show=${params.search.get("show")}`);
        //console.log(document.location.search);

        updateUrl(params);

        showSection(data, config, params);

        return;
    }

    function updateUrl(params) {
        let newUrl = "";

        if (params.search.get("view") === "mods") {
            newUrl = `?view=${params.search.get("view")}&offset=${params.search.get("offset")}&show=${params.search.get("show")}`;
        } else {
            newUrl = `?view=${params.search.get("view")}`;
        }

        history.pushState({
            id: 'homepage'
        }, document.title, newUrl);

        return;
    }

    function validateOffset(config, params) {
        let offset = Number(params.offset);
        let modListLength = Number(params.modListLength);
        let show = Number(params.show);
        let newOffset = offset;

        if (offset < 0) {
            newOffset = Number(config.defaults["offset"]);
        } else if (offset > modListLength) {
            newOffset = modListLength - show;
        } else if (offset >= 0 && offset < modListLength) {
            newOffset = offset;
        }

        params.offset = newOffset;
        params.search.set("offset", params.offset);

        updateUrl(params);

        return params;
    }

    function validateShow(params) {
        let show = params.show;
        let modListLength = Number(params.modListLength);
        let newShow = show;

        if (show === "all") {
            newShow = "all";
            params.maxNum = modListLength;
        } else {
            show = Number(show);
            if (show <= 0) {
                newShow = 1;
            } else if (show > modListLength) {
                newShow = modListLength;
            }
        }

        params.show = newShow;
        params.search.set("show", params.show);

        updateUrl(params);

        return params;
    }

    function validateMaxNum(params) {
        let maxNum = Number(params.maxNum);
        let modListLength = Number(params.modListLength);
        let offset = Number(params.offset);
        let newMaxNum = maxNum;

        if (maxNum > modListLength) {
            newMaxNum = modListLength;
        }
        if (offset >= newMaxNum) {
            params.offset = Math.floor(newMaxNum - show);
            params.search.set("offset", params.offset);
        }
        params.maxNum = newMaxNum;

        updateUrl(params);

        return params;
    }

    function hideAllSections(config, params) {
        let mainNode = null;
        params.container = document.getElementById(config.containers["main"]);
        params.returnAllNodes = true;
        params.elem = "section";

        if (params.container) {
            mainNode = findNode(params);
        }

        if (mainNode) {
            Object.keys(mainNode).forEach(function(key) {
                mainNode[key].classList.remove("visible");
                mainNode[key].classList.add("invisible");
            });
        }

        return;
    }

    function toggleActiveNav(config, params) {
        let navNode = null;
        params.container = document.getElementById(config.containers["topNav"]);
        params.returnAllNodes = true;
        params.elem = "li";

        if (params.container) {
            navNode = findNode(params);
        }

        if (navNode) {
            Object.keys(navNode).forEach(function(key) {
                navNode[key].classList.remove("active");
                if (navNode[key].firstElementChild.innerHTML.toLowerCase() === params.activeNav.toLowerCase()) {
                    navNode[key].classList.add("active");
                }
            });
        }

        return;
    }

    function enableAncestorSection(node) {
        let ancestorNode = findAncestorSection(node);

        if (ancestorNode) {
            ancestorNode.classList.remove("invisible");
            ancestorNode.classList.add("visible");
        } else {
            displayError();
        }

        return;
    }

    function showSection(data, config, params) {
        hideAllSections(config, params);

        switch (params.search.get("view")) {
            case "tools":
                displayTools(data, config, params);
                break;
            case "merges":
                displayMerges(data, config, params);
                console.log(params);
                break;
            default:
                displayMods(data, config, params);
        }

        return;
    }

    function displayError() {
        document.body.innerHTML = `<div class="alert alert-danger" role="alert">Something went very wrong!</div>`;

        return;
    }

    function displayMods(data, config, params) {
        const mods = data.mods.sort(compareValues("name"));
        /*const nsfwMods = Object.keys(mods).filter(function(key) {
            //console.log(mods[key]);
            //return mods[key]["nsfw"] === "y";
            return mods[key];
        });
        console.log(nsfwMods);*/
        let modsTableNode = null;
        params.container = document.getElementById(config.tables["mods"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "mods";

        if (params.container) {
            modsTableNode = findNode(params);
        } else {
            displayError();
        }

        if (modsTableNode) {
            toggleActiveNav(config, params);
            enableAncestorSection(modsTableNode);

            // respect requested pagination
            handlePaginationMath(config, params);

            // get all the mods and create the merged file objects, stats, and categories list
            getModAttributes(data, config, params);

            // ... but now only show what's necessary
            let subset = mods.slice(params.offset, params.maxNum);
            Object.keys(subset).forEach(function(key) {
                params.resultName = subset[key].name;
                params.linkUrl = subset[key].url;
                params.childAttr = {
                    id: `row-${cleanName(subset[key].name)}`
                };
                if (subset[key].nsfw === "y") {
                    params.childAttr["class"] = "text-muted font-italic";
                }
                params.contents = `<td>${showLink(config, params)}</td>
                    <td>${checkBasicField(subset[key].source)}</td>
                    <td>${showVersions(config, subset[key].versions)}</td>
                    <td>${checkBasicField(subset[key].category)}</td>
                    <td>${showAssociatedMerges(config, subset[key].mergedFiles)}</td>
                    <td>${showStatus(config, subset[key].status)}</td>
                    <td>${checkBasicField(subset[key].comments)}</td>`;

                modsTableNode.appendChild(insertChildNode(params));
            });

            // show filters
            if (params.modCategories.length > 0) {
                //console.log(params.modCategories.sort()); // dev
            }

            // show pagination
            showPagination(config, params);

            // show stats
            /*let statsNode = null;
            params.container = document.getElementById(config.containers["stats"]);
            params.elem = null;
            params.childNode = "div";
            params.childAttr = {
                class: "progress"
            };

            if (params.container) {
                statsNode = params.container;
            }

            if (statsNode) {
                params.contents = showModStats(params);
                statsNode.appendChild(insertChildNode(params));
            }*/
        } else {
            displayError();
        }

        return;
    }

    function displayTools(data, config, params) {
        const tools = data.tools.sort(compareValues("name"));
        let toolsTableNode = null;
        params.container = document.getElementById(config.tables["tools"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "tools";

        if (params.container) {
            toolsTableNode = findNode(params);
        } else {
            displayError();
        }

        if (toolsTableNode) {
            toggleActiveNav(config, params);
            enableAncestorSection(toolsTableNode);

            Object.keys(tools).forEach(function(key) {
                params.resultName = tools[key].name;
                params.linkUrl = tools[key].url;
                params.childAttr = {
                    id: `row-${cleanName(tools[key].name)}`
                };
                params.contents = `<td>${showLink(config, params)}</td>
                    <td>${checkBasicField(tools[key].source)}</td>
                    <td>${showVersions(config, tools[key].versions)}</td>
                    <td>${showStatus(config, tools[key].status)}</td>
                    <td>${checkBasicField(tools[key].comments)}</td>`;

                toolsTableNode.appendChild(insertChildNode(params));
            });
        } else {
            displayError();
        }

        return;
    }

    function displayMerges(data, config, params) {
        const merges = data.merges.sort(compareValues("name"));
        let mergesTableNode = null;
        params.container = document.getElementById(config.tables["merges"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "merges";

        if (params.container) {
            mergesTableNode = findNode(params);
        } else {
            displayError();
        }

        if (mergesTableNode) {
            // get all the mods and create the merged file objects, stats, and categories list
            getModAttributes(data, config, params);

            toggleActiveNav(config, params);
            enableAncestorSection(mergesTableNode);

            Object.keys(merges).forEach(function(key) {
                params.childAttr["id"] = `row-${cleanMergeName(merges[key].name)}`;
                params.mergeName = merges[key].name;
                params.contents = `<td>${checkBasicField(merges[key].name)} ${showMergedFileAccordion(params)}</td>
                    <td>${showNavmeshToggle(merges[key].rebuildNavmeshOnMerge)}</td>
                    <td>${checkBasicField(merges[key].comments)}</td>`;
                mergesTableNode.appendChild(insertChildNode(params));

                params.childAttr = {};
            });
        } else {
            displayError();
        }

        return;
    }


    /**********
     * Function declarations: Pagination and statistics
     **********/
    function handlePaginationMath(config, params) {
        params.show = params.search.get("show");
        params.offset = Number(params.search.get("offset"));
        params.modListLength = Number(config.dataLength["mods"]);
        params.maxNum = params.modListLength;

        validateOffset(config, params);
        validateShow(params);

        if (params.show !== "all") { // show by page
            params.maxNum = Number(params.offset) + Number(params.show);
            params.show = Number(params.show);

            validateMaxNum(params);

            params.pageCount = Math.ceil(params.modListLength / params.show);
            params.currentPage = Math.ceil(params.offset / params.show) + 1;
        }

        return params;
    }

    function showPagination(config, params) {
        let paginationNode = null;

        if ((params.show !== "all") && (params.show < params.modListLength)) {
            params.container = document.getElementById(config.containers["pagination"]);
            params.elem = null;
            params.childNode = "ul";
            params.childAttr = {
                class: "pagination pagination-sm justify-content-center"
            };

            if (params.container) {
                paginationNode = params.container;
            }

            if (paginationNode) {
                params.contents = showPrevPage(params);
                params.contents += showNumberedPages(params);
                params.contents += showNextPage(params);

                paginationNode.appendChild(insertChildNode(params));
            }
        }

        return;
    }

    function showPrevPage(params) {
        let newOffset = Number(params.offset) - Number(params.show);
        let classes = ["page-item"];
        let output = "";

        if (newOffset < 0) {
            newOffset = 0;
        }
        params.search.set("offset", newOffset);

        if (params.currentPage < 2) {
            classes.push("disabled");
        }

        output += `<li class="${classes.join(" ")}">
                <a class="page-link" href="?view=mods&offset=${newOffset}&show=${params.show}">Previous</a>
            </li>`;

        return output;
    }

    function showNextPage(params) {
        let newOffset = Number(params.offset) + Number(params.show);
        let offsetLimit = Number(params.modListLength) - Number(params.show);
        //let pageLimit = Number(params.pageCount) - 1;
        let pageLimit = Number(params.pageCount);
        let classes = ["page-item"];
        let output = "";

        if (newOffset > offsetLimit) {
            newOffset = offsetLimit;
        }
        params.search.set("offset", newOffset);

        if (params.currentPage >= pageLimit) {
            classes.push("disabled");
        }

        output += `<li class="${classes.join(" ")}">
                <a class="page-link" href="?view=mods&offset=${newOffset}&show=${params.show}">Next</a>
            </li>`;

        return output;
    }

    function showNumberedPages(params) {
        let offset = Number(params.offset);
        let show = Number(params.show);
        let maxNum = Number(params.maxNum);
        let offsetText = offset;
        let output = "";

        if (offset === 0) {
            offsetText = 1;
        }

        // numbered page situation was a shitshow - cheating with a prev + text + next solution for now

        output += `<li class="page-item disabled">
                <a class="page-link text-dark" href="?view=mods&offset=${offset}&show=${show}">Viewing ${offsetText} &ndash; ${maxNum} of ${params.modListLength}</a>
            </li>`;

        return output;
    }

    function showModStats(params) {
        let output = "";
        let total = Number(params.modStats["enabled"]) + Number(params.modStats["disabled"]);
        let enabledCount = Math.ceil((Number(params.modStats["enabled"]) / total) * 100);
        let disabledCount = Math.ceil((Number(params.modStats["disabled"]) / total) * 100);
        let otherCount = 100 - (enabledCount + disabledCount);

        output += `<div class="progress-bar bg-success" role="progressbar" style="width: ${enabledCount}%" title="Enabled: ${enabledCount}%">Enabled</div>`;
        output += `<div class="progress-bar bg-danger" role="progressbar" style="width: ${disabledCount}%" title="Disabled: ${disabledCount}%">Disabled</div>`;
        output += `<div class="progress-bar bg-warning" role="progressbar" style="width: ${otherCount}%" title="???: ${otherCount}%">???</div>`;

        return output;
    }

    /**********
     * Callback for loaded JSON
     **********/
    loadJSON(function(response) {
        const jsonResponse = JSON.parse(response);
        const data = {
            merges: jsonResponse.mergedEsps,
            mods: jsonResponse.mods,
            tools: jsonResponse.tools
        };
        const config = {
            containers: {
                main: "container-main",
                pagination: "pagination-mods",
                stats: "stats-mods",
                topNav: "navbar-top"
            },
            dataLength: {
                merges: data["merges"].length,
                mods: data["mods"].length,
                tools: data["tools"].length
            },
            defaults: {
                category: "all",
                maxWidth: "10rem",
                offset: 0,
                show: 25,
                source: "all",
                view: "mods"
            },
            modals: {
                merges: "#modal-merges",
                mods: "#modal-mods"
            },
            tables: {
                merges: "table-merges",
                mods: "table-mods",
                tools: "table-tools"
            },
            validStatuses: {
                cannibalize: ["resource"],
                disabled: ["deactivated", "disabled", "smc - deactivated", "smc - disabled", "not installed"],
                downloaded: ["downloaded"],
                enabled: ["activated", "enabled", "smc", "smc - activated", "smc - enabled", "installed"]
            }
        };
        let params = {
            childAttr: {},
            mergedFileContents: {},
            modCategories: [],
            modStats: {
                enabled: 0,
                disabled: 0
            }
        };

        // update view
        updateQuery(data, config, params);

        // deal with modals
        $(config.modals["mods"]).on("show.bs.modal", function(e) { // Bootstrap modal
            params.find = $(e.relatedTarget);
            params.find = params.find[0].innerHTML;
            params.modal = "mods";
            params.searchIn = data.mods;
            refreshModalContents(config, params);
        });
        $(config.modals["merges"]).on("show.bs.modal", function(e) { // Bootstrap modal
            params.find = $(e.relatedTarget);
            params.find = params.find[0].innerHTML;
            params.modal = "merges";
            params.searchIn = data.merges;
            refreshModalContents(config, params);
        });

    });

})();