/**************************************************
 * Still need to implement:
 ** Filter by name (search), nsfw/sfw
 ** Compare to Modwatch??? (May not be feasible with this particular approach)
 **************************************************/

(function() {
    "use strict";

    const url = "js/data.json";

    fetch(url)
        .then((resp) => resp.json())
        .then(function(jsonData) {

            let params = {
                data: {
                    categories: jsonData.categories,
                    merges: jsonData.merges,
                    mods: jsonData.mods,
                    sources: jsonData.sources,
                    statuses: jsonData.statuses,
                    tools: jsonData.tools
                },
                childAttr: {},
                containers: {
                    categoryNav: "mods-category-navbar-dropdown",
                    messages: "messages",
                    main: "container-main",
                    pagination: "pagination-mods",
                    sourceNav: "mods-source-navbar-dropdown",
                    statusNav: "mods-status-navbar-dropdown",
                    topNav: "navbar-top"
                },
                defaults: {
                    category: "all",
                    maxWidth: "10rem",
                    offset: 0,
                    show: 1000,
                    source: "all",
                    status: "all",
                    nsfw: true,
                    view: "mods"
                },
                messages: [],
                mergedFileContents: {},
                modals: {
                    merges: "#modal-merges",
                    mods: "#modal-mods"
                },
                tables: {
                    merges: "table-merges",
                    mods: "table-mods",
                    tools: "table-tools"
                }
            };
            params.dataLength = {
                merges: params.data["merges"].length,
                mods: params.data["mods"].length,
                tools: params.data["tools"].length
            };

            // update view
            updateQuery(params);
            showSection(params);

            // deal with modals
            $(params.modals["mods"]).on("show.bs.modal", function(e) { // Bootstrap modal
                params.find = $(e.relatedTarget);
                params.find = params.find[0].innerHTML;
                params.modal = "mods";
                params.searchIn = params.data["mods"];
                refreshModalContents(params);
            });
            $(params.modals["merges"]).on("show.bs.modal", function(e) { // Bootstrap modal
                params.find = $(e.relatedTarget);
                params.find = params.find[0].innerHTML;
                params.modal = "merges";
                params.searchIn = params.data["merges"];
                refreshModalContents(params);
            });

            console.log("test successful");

        })
        .catch(function(error) {
            console.log(error);
            displayFatalError();
        });


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
    function caseInsensitiveSort(array) {
        return array.sort(function(a, b) {
            let x = a.toLowerCase();
            let y = b.toLowerCase();

            if (x < y) {
                return -1;
            }
            if (y < x) {
                return 1;
            }

            return 0;
        });
    }

    function cleanName(name) {
        return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, ""); // strip special characters
    }

    function cleanMergeName(mergeName) {
        let cleanedName = cleanName(mergeName);
        cleanedName = cleanedName.substring(0, cleanedName.length - 4); // remove the .esp extension

        return cleanedName;
    }

    function checkBasicField(params, field) {
        let output = "";

        if (field && typeof field === "object") {
            let fieldArray = Object.values(field);

            output = `<ul class="list-unstyled">`;
            fieldArray.forEach(function(item) {
                output += `<li class="text-truncate" style="max-width: ${params.defaults["maxWidth"]};" title="${item}">${item}</li>`;
            });
            output += `</ul>`;
        } else if (field && typeof field === "string") {
            output += `<div>${field}</div>`;
        }

        return output;
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

    function matchAttributeToReference(list, attribute, matchBy = "friendlyName") {
        let output = null;

        Object.keys(list).forEach(function(key) {
            if (list[key][matchBy] === attribute) {
                output = list[key];
            }
        });

        return output;
    }

    function matchAttributeToMod(attribute, search) {
        let output = false;

        if (attribute === search) {
            output = true;
        }

        return output;
    }

    /**********
     * Function declarations: Data
     **********/
    function filterModData(params) {
        let offset = Number(params.search.get("offset"));
        let maxNum = Number(params.maxNum);
        let categories = params.data["categories"];
        let sources = params.data["sources"];
        let statuses = params.data["statuses"];
        let searchCategory = null;
        let searchSource = null;
        let searchStatus = null;
        let filterMessageText = [];
        params.subset = [];

        if ((params.search.get("category") !== "all") || (params.search.get("source") !== "all") || (params.search.get("status") !== "all")) {
            //if ((params.search.get("category") !== params.defaults["category"]) || (params.search.get("source") !== params.defaults["source"]) || (params.search.get("status") !== params.defaults["status"])) {
            console.log("some filter is active");

            searchCategory = matchAttributeToReference(categories, params.search.get("category"));
            searchSource = matchAttributeToReference(sources, params.search.get("source"));
            searchStatus = matchAttributeToReference(statuses, params.search.get("status"));

            console.log("searchCategory = ", searchCategory, "-----");
            console.log("searchSource = ", searchSource, "-----");
            console.log("searchStatus = ", searchStatus, "-----------");

            // set error messages if necessary
            if ((params.search.get("category") !== params.defaults["category"]) && (searchCategory === null || searchCategory === undefined)) {
                params.messages.push({
                    messageText: "Invalid filter criteria. Showing all categories.",
                    messageType: "error"
                });
            }
            if ((params.search.get("source") !== params.defaults["source"]) && (searchSource === null || searchSource === undefined)) {
                params.messages.push({
                    messageText: "Invalid filter criteria. Showing all sources.",
                    messageType: "error"
                });
            }
            if ((params.search.get("status") !== params.defaults["status"]) && (searchStatus === null || searchStatus === undefined)) {
                params.messages.push({
                    messageText: "Invalid filter criteria. Showing all statuses.",
                    messageType: "error"
                });
            }

            // set filter messages
            if (params.search.get("category") !== "all") {
                filterMessageText.push(`Category: &lsquo;${searchCategory.name}&rsquo;`);
            }
            if (params.search.get("source") !== "all") {
                filterMessageText.push(`Source: &lsquo;${searchSource.name}&rsquo;`);
            }
            if (params.search.get("status") !== "all") {
                filterMessageText.push(`Status: &lsquo;${searchStatus.name}&rsquo;`);
            }
            params.messages.push({
                messageText: "<span class=\"font-weight-bold\">Filtering by&hellip;</span>     " + filterMessageText.join(" | "),
                messageType: "info"
            });

            // get with the filtering
            let mods = params.data["mods"];
            Object.keys(mods).forEach(function(key) {
                params.mod = mods[key];

                // all mod filter scenarios (category / source / status)
                if ((mods[key].category && searchCategory !== null) && (mods[key].source && searchSource !== null) && (mods[key].status && searchStatus !== null)) { // if category + source + status

                    // handle category filtering
                    params.filter = searchCategory;
                    filterModDataByAttribute(params);
                    // handle source filtering
                    params.filter = searchSource;
                    filterModDataByAttribute(params, "source", true);
                    // handle status filtering
                    params.filter = searchStatus;
                    filterModDataByAttribute(params, "status", true);

                } else if ((mods[key].category && searchCategory !== null) && (mods[key].source && searchSource !== null)) { // if category + source

                    // handle category filtering
                    params.filter = searchCategory;
                    filterModDataByAttribute(params);
                    // handle source filtering
                    params.filter = searchSource;
                    filterModDataByAttribute(params, "source", true);

                } else if ((mods[key].category && searchCategory !== null) && (mods[key].status && searchStatus !== null)) { // if category + status

                    // handle category filtering
                    params.filter = searchCategory;
                    filterModDataByAttribute(params, "category");
                    // handle status filtering
                    params.filter = searchStatus;
                    filterModDataByAttribute(params, "status", true);

                } else if (mods[key].category && searchCategory !== null) { // if category

                    // handle category filtering
                    params.filter = searchCategory;
                    filterModDataByAttribute(params, "category");

                } else if ((mods[key].source && searchSource !== null) && (mods[key].status && searchStatus !== null)) { // if source + status

                    // handle source filtering
                    params.filter = searchSource;
                    filterModDataByAttribute(params, "source");
                    // handle status filtering
                    params.filter = searchStatus;
                    filterModDataByAttribute(params, "status", true);

                } else if (mods[key].source && searchSource !== null) { // if source

                    // handle source filtering
                    params.filter = searchSource;
                    filterModDataByAttribute(params, "source");

                } else if (mods[key].status && searchStatus !== null) { // if status

                    // handle status filtering
                    params.filter = searchStatus;
                    filterModDataByAttribute(params, "status");

                }

            });

            if (params.subset.length === 0) {
                //params.subset = mods;
                params.messages.push({
                    messageText: "No results found.",
                    messageType: "error"
                });
            }

            params.dataLength["mods"] = params.subset.length;
            params.subset = params.subset.slice(offset, maxNum);
            handlePaginationMath(params);

            return params;
        } else {
            console.log("no filter is active");

            params.subset = params.data["mods"].slice(offset, maxNum);

            return params;
        }

        return;
    }

    function filterModDataByAttribute(params, field = "category", reductive = false) {
        let mod = params.mod;
        let filter = params.filter;
        let index = null;

        if (typeof mod[field] === "object") {
            let filterTypeArray = Object.values(mod[field]);

            filterTypeArray.forEach(function(item) {
                if (matchAttributeToMod(item, filter.name) && !reductive) {
                    params.subset.push(mod);
                } else if (!matchAttributeToMod(item, filter.name) && reductive) {
                    index = params.subset.indexOf(mod);
                    //console.log("index = " + index);
                    if (index >= 0) {
                        params.subset.splice(index, 1);
                    }
                }
            });

            return params;
        } else {
            if (matchAttributeToMod(mod[field], filter.name) && !reductive) {
                params.subset.push(mod);
            } else if (!matchAttributeToMod(mod[field], filter.name) && reductive) {
                index = params.subset.indexOf(mod);
                if (index >= 0) {
                    params.subset.splice(index, 1);
                }
            }

            return params;
        }

        return;
    }

    function getModAttributes(params) {
        const mods = params.data["mods"];
        let modStatuses = [];

        Object.keys(mods).forEach(function(key) {
            let files = mods[key].mergedFiles;
            let status = mods[key].status;

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

            if (status) {
                /*if (typeof status === "string" && !modStatuses.includes(status)) {
                    modStatuses.push(status);
                } else if (typeof status === "object") {
                    let statusArray = Object.values(status);

                    statusArray.forEach(function(item) {
                        if (!modStatuses.includes(item)) {
                            modStatuses.push(item);
            }
                    });
            }*/
                status = status.toLowerCase();
            }
        });

        return params;
    }

    function showLink(params) {
        let output = "";
        let maxWidth = Math.floor(Number(params.defaults["maxWidth"].substring(0, (params.defaults["maxWidth"].length - 3))) * 2);
        let target = "_self";
        let linkText = params.resultName;

        if (params.linkUrl) {
            if (params.linkUrl.startsWith("http")) {
                target = "_blank";
                linkText += ` <small class="text-muted font-weight-light oi oi-external-link" title="(external link)"></small>`;
            }
            output = `<a class="d-inline-block" href="${params.linkUrl}" target="${target}" style="max-width: ${maxWidth}rem;" title="${params.resultName}">${linkText}</a>`;
        } else {
            output = `<div style="max-width: ${maxWidth}rem;" title="${params.resultName}">${linkText}</div>`;
        }

        return output;
    }

    function showVersions(params, versions) {
        let output = "";
        let versionText = "";

        if (typeof versions === "object") {
            output = `<ul class="list-unstyled">`;

            Object.keys(versions).forEach(function(key) {
                versionText = key;
                if (versions[key]) {
                    versionText += `: ${versions[key]}`;
                }
                output += `<li class="text-truncate" style="max-width: ${params.defaults["maxWidth"]};" title="${versionText}">${versionText}</li>`;
            });

            output += `</ul>`;
        } else if (typeof versions === "string") {
            output = `<div class="text-truncate" style="max-width: ${params.defaults["maxWidth"]};" title="${versions}">${versions}</div>`;
        }

        return output;
    }

    function showStatus(params, status) {
        let statusKey = matchAttributeToReference(params.data["statuses"], status, "name");
        let output = "";

        if (statusKey) {
            output = `<span class="badge badge-pill badge-${statusKey["type"]}">${status}</span>`;
        }

        return output;
    }

    function showAssociatedMerges(params, merge) {
        let output = "";

        if (typeof merge === "object") {
            output = `<ul class="list-unstyled">`;

            Object.keys(merge).forEach(function(key) {
                output += `<li class="text-truncate" style="max-width: ${params.defaults["maxWidth"]};" title="${key}"><a id="modal-for-${cleanMergeName(key)}" data-dismiss="modal" data-toggle="modal" data-target="#modal-merges" href="#">${key}</a></li>`;
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

    function showMergedFileListInBow(params) {
        let output = "";
        let merge = params.mergedFileContents[params.mergeName];
        let mergedFileList = [];

        if (checkForMergedFileContents(merge)) {
            Object.keys(merge).forEach(function(key) {
                if (merge[key][0].length > 1) {
                    merge[key][0].forEach(function(i) {
                        mergedFileList.push(i);
                    });
                } else {
                    mergedFileList.push(merge[key][0].toString());
                }
            });

            output += `
                <form>
                    <div class="form-group">
                        <label for="merged-file-list">File list only</label>
                        <textarea class="form-control form-control-sm" id="merged-file-list" rows="5">${caseInsensitiveSort(mergedFileList).join("\n")}</textarea>
                    </div>
                </form>`;
        }

        return output;
    }

    function updateFilterAllNav(params) {
        params.nav = params.containers["categoryNav"];
        params.list = params.categories;
        updateFilterNav(params);

        params.nav = params.containers["sourceNav"];
        params.list = params.sources;
        updateFilterNav(params, "sources");

        params.nav = params.containers["statusNav"];
        params.list = params.statuses;
        updateFilterNav(params, "statuses");

        return;
    }

    function updateFilterNav(params, type = "categories") {
        let navNode = null;
        let list = params.list;
        let offset = Number(params.defaults["offset"]);
        let show = Number(params.defaults["show"]);
        let category = params.search.get("category");
        let source = params.search.get("source");
        let status = params.search.get("status");
        let nsfw = params.search.get("nsfw");
        params.container = document.getElementById(params.nav);
        params.returnAllNodes = false;
        params.elem = "div";
        params.childNode = "a";
        params.childAttr = {
            class: "dropdown-item"
        };

        switch (type) {
            case "sources":
                source = "all";
                break;
            case "statuses":
                status = "all";
                break;
            default:
                category = "all";
        }

        if (params.container) {
            navNode = findNode(params);
        }

        if (navNode) {
            params.childAttr["href"] = `?view=mods&offset=${offset}&show=${show}&category=${category}&source=${source}&status=${status}`;
            params.contents = `All ${type}`;

            navNode.appendChild(insertChildNode(params));

            category = params.search.get("category");
            source = params.search.get("source");
            status = params.search.get("status");

            Object.keys(list).forEach(function(key) {
                switch (type) {
                    case "sources":
                        source = list[key].friendlyName;
                        break;
                    case "statuses":
                        status = list[key].friendlyName;
                        break;
                    default:
                        category = list[key].friendlyName;
                }
                params.childAttr["href"] = `?view=mods&offset=${offset}&show=${show}&category=${category}&source=${source}&status=${status}`;
                params.contents = `${list[key].name}`;

                navNode.appendChild(insertChildNode(params));
            });
        }

        return;
    }

    /**********
     * Function declarations: Modals
     **********/
    function refreshModalContents(params) {
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
                    <dd class="col-sm-9">${checkBasicField(params, found.source)}</dd>
                    <dt class="col-sm-3">Version(s):</dt>
                    <dd class="col-sm-9">${showVersions(params, found.versions)}</dd>
                    <dt class="col-sm-3">Category:</dt>
                    <dd class="col-sm-9">${checkBasicField(params, found.category)}</dd>
                    <dt class="col-sm-3">Merged to:</dt>
                    <dd class="col-sm-9">${showAssociatedMerges(params, found.mergedFiles)}</dd>
                    <dt class="col-sm-3">Status:</dt>
                    <dd class="col-sm-9">${showStatus(params, found.status)}</dd>
                    <dt class="col-sm-3">Comments:</dt>
                    <dd class="col-sm-9">${checkBasicField(params, found.comments)}</dd>
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
                        <dd class="col-sm-9">${checkBasicField(params, found.comments)}</dd>`;
                }

                newModalContent += `</dl>`;
                newModalContent += showMergedFileListInBow(params);

            }
        }

        modalTitleNode.innerHTML = newModalTitle;
        modalContentNode.innerHTML = newModalContent;

        return;
    }

    /**********
     * Function declarations: Search/filter/views
     **********/
    function updateQuery(params) {
        params.search = new URLSearchParams(document.location.search.substring(1));

        if (params.search.has("view") === false) {
            params.search.set("view", params.defaults["view"]);
        }
        if (params.search.has("offset") === false) {
            params.search.set("offset", params.defaults["offset"]);
        }
        if (params.search.has("show") === false) {
            params.search.set("show", params.defaults["show"]);
        }
        if (params.search.has("category") === false) {
            params.search.set("category", params.defaults["category"]);
        }
        if (params.search.has("source") === false) {
            params.search.set("source", params.defaults["source"]);
        }
        if (params.search.has("status") === false) {
            params.search.set("status", params.defaults["status"]);
        }
        if (params.search.has("nsfw") === false) {
            params.search.set("nsfw", params.defaults["nsfw"]);
        }

        updateUrl(params);

        return;
    }

    function updateUrl(params) {
        let newUrl = "";

        if (params.search.get("view") === "mods") {
            newUrl = `?view=${params.search.get("view")}&offset=${params.search.get("offset")}&show=${params.search.get("show")}&category=${params.search.get("category")}&source=${params.search.get("source")}&status=${params.search.get("status")}`;
        } else {
            newUrl = `?view=${params.search.get("view")}`;
        }

        history.pushState({
            id: 'homepage'
        }, document.title, newUrl);

        return;
    }

    function validateOffset(params) {
        let offset = Number(params.search.get("offset"));
        let show = Number(params.search.get("show"));
        let modListLength = Number(params.dataLength["mods"]);
        let newOffset = offset;

        if (offset < 0) {
            newOffset = Number(params.defaults["offset"]);
        } else if (offset > modListLength) {
            newOffset = modListLength - show;
        } else if (offset >= 0 && offset < modListLength) {
            newOffset = offset;
        }

        params.search.set("offset", newOffset);

        updateUrl(params);

        return params;
    }

    function validateShow(params) {
        let show = Number(params.search.get("show"));
        let modListLength = Number(params.dataLength["mods"]);
        let newShow = show;

        if (show === "all") {
            newShow = "all";
            params.maxNum = modListLength;
        } else {
            show = Number(show);
            if (show > modListLength) {
                newShow = modListLength;
            }
            if (show <= 0) {
                newShow = 1;
            }
        }

        params.search.set("show", newShow);

        updateUrl(params);

        return params;
    }

    function validateMaxNum(params) {
        let maxNum = Number(params.maxNum);
        let modListLength = Number(params.dataLength["mods"]);
        let offset = Number(params.search.get("offset"));
        let show = Number(params.search.get("show"));
        let newMaxNum = maxNum;

        if (maxNum > modListLength) {
            newMaxNum = modListLength;
        }
        if (offset >= newMaxNum) {
            offset = Math.floor(newMaxNum - show);
            params.search.set("offset", offset);
        }
        params.maxNum = newMaxNum;

        updateUrl(params);

        return params;
    }

    function hideAllSections(params) {
        let mainNode = null;
        params.container = document.getElementById(params.containers["main"]);
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

    function toggleActiveNav(params) {
        let navNode = null;
        params.container = document.getElementById(params.containers["topNav"]);
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
            displayFatalError();
        }

        return;
    }

    function showSection(params) {
        hideAllSections(params);

        switch (params.search.get("view")) {
            case "tools":
                displayTools(params);
                break;
            case "merges":
                displayMerges(params);
                console.log(params);
                break;
            default:
                displayMods(params);
        }

        return;
    }

    function showMessages(params) {
        let messagesNode = null;
        params.container = document.getElementById(params.containers["messages"]);
        params.returnAllNodes = false;
        params.elem = "div";
        params.childNode = "p";
        params.childAttr = {
            class: "alert"
        };

        if (params.container) {
            messagesNode = findNode(params);
        }

        if (messagesNode && (params.messages.length > 0)) {
            params.messages.forEach(function(item) {
                if (item.messageType === "error") {
                    params.childAttr.class = params.childAttr.class + " alert-danger";
                } else {
                    params.childAttr.class = params.childAttr.class + " alert-info";
                }
                params.contents = `${item.messageText}`;

                messagesNode.appendChild(insertChildNode(params));
            });
            params.container.classList.remove("invisible");
        }
    }

    function displayFatalError() {
        document.body.innerHTML = `<div class="alert alert-danger" role="alert">Something went very wrong!</div>`;

        return;
    }

    function displayMods(params) {
        const mods = params.data["mods"].sort(compareValues("name"));
        let modsTableNode = null;
        params.container = document.getElementById(params.tables["mods"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "mods";
        params.categories = params.data["categories"].sort(compareValues("name"));
        params.sources = params.data["sources"].sort(compareValues("name"));
        params.statuses = params.data["statuses"].sort(compareValues("name"));

        if (params.container) {
            modsTableNode = findNode(params);
        } else {
            displayFatalError();
        }

        if (modsTableNode) {
            toggleActiveNav(params);
            enableAncestorSection(modsTableNode);

            // get all the mods and create the merged file objects, stats, and categories list
            getModAttributes(params);

            // respect requested pagination
            handlePaginationMath(params);

            // ... but now only show what's necessary
            filterModData(params);
            console.log("----------");
            console.log(params);

            Object.keys(params.subset).forEach(function(key) {
                params.resultName = params.subset[key].name;
                params.linkUrl = params.subset[key].url;
                params.childAttr = {
                    id: `row-${cleanName(params.subset[key].name)}`
                };
                if (params.subset[key].nsfw === "y") {
                    params.childAttr["class"] = "text-muted font-italic";
                }
                params.contents = `<td>${showLink(params)}</td>
                    <td>${checkBasicField(params, params.subset[key].source)}</td>
                    <td>${showVersions(params, params.subset[key].versions)}</td>
                    <td>${checkBasicField(params, params.subset[key].category)}</td>
                    <td>${showAssociatedMerges(params, params.subset[key].mergedFiles)}</td>
                    <td>${showStatus(params, params.subset[key].status)}</td>
                    <td>${checkBasicField(params, params.subset[key].comments)}</td>`;

                modsTableNode.appendChild(insertChildNode(params));
            });

            // show filters
            updateFilterAllNav(params);

            // show pagination
            showPagination(params);

            // show any error messages
            showMessages(params);

        } else {
            displayFatalError();
        }

        return;
    }

    function displayTools(params) {
        const tools = params.data["tools"].sort(compareValues("name"));
        let toolsTableNode = null;
        params.container = document.getElementById(params.tables["tools"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "tools";

        if (params.container) {
            toolsTableNode = findNode(params);
        } else {
            displayFatalError();
        }

        if (toolsTableNode) {
            toggleActiveNav(params);
            enableAncestorSection(toolsTableNode);

            Object.keys(tools).forEach(function(key) {
                params.resultName = tools[key].name;
                params.linkUrl = tools[key].url;
                params.childAttr = {
                    id: `row-${cleanName(tools[key].name)}`
                };
                params.contents = `<td>${showLink(params)}</td>
                    <td>${checkBasicField(params, tools[key].source)}</td>
                    <td>${showVersions(params, tools[key].versions)}</td>
                    <td>${showStatus(params, tools[key].status)}</td>
                    <td>${checkBasicField(params, tools[key].comments)}</td>`;

                toolsTableNode.appendChild(insertChildNode(params));
            });
        } else {
            displayFatalError();
        }

        return;
    }

    function displayMerges(params) {
        const merges = params.data["merges"].sort(compareValues("name"));
        let mergesTableNode = null;
        params.container = document.getElementById(params.tables["merges"]);
        params.returnAllNodes = false;
        params.elem = "tbody";
        params.childNode = "tr";
        params.childAttr = {};
        params.activeNav = "merges";

        if (params.container) {
            mergesTableNode = findNode(params);
        } else {
            displayFatalError();
        }

        if (mergesTableNode) {
            // get all the mods and create the merged file objects, stats, and categories list
            getModAttributes(params);

            toggleActiveNav(params);
            enableAncestorSection(mergesTableNode);

            Object.keys(merges).forEach(function(key) {
                params.childAttr["id"] = `row-${cleanMergeName(merges[key].name)}`;
                params.mergeName = merges[key].name;
                params.contents = `<td>${checkBasicField(params, merges[key].name)} ${showMergedFileAccordion(params)}</td>
                    <td>${showNavmeshToggle(merges[key].rebuildNavmeshOnMerge)}</td>
                    <td>${checkBasicField(params, merges[key].comments)}</td>`;
                mergesTableNode.appendChild(insertChildNode(params));

                params.childAttr = {};
            });
        } else {
            displayFatalError();
        }

        return;
    }


    /**********
     * Function declarations: Pagination and statistics
     **********/
    function handlePaginationMath(params) {
        let show = Number(params.search.get("show"));
        let offset = Number(params.search.get("offset"));
        let modListLength = Number(params.dataLength["mods"]);
        params.maxNum = modListLength;

        validateOffset(params);
        validateShow(params);
        validateMaxNum(params);

        if (show !== "all") { // show by page
            params.maxNum = offset + show;

            validateMaxNum(params);

            params.pageCount = Math.ceil(modListLength / show);
            params.currentPage = Math.ceil(offset / show) + 1;
        }

        return params;
    }

    function showPagination(params) {
        let paginationNode = null;
        let modListLength = Number(params.dataLength["mods"]);

        if ((params.search.get("show") !== "all") && (Number(params.search.get("show")) < modListLength)) {
            params.container = document.getElementById(params.containers["pagination"]);
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
        let offset = Number(params.search.get("offset"));
        let show = Number(params.search.get("show"));
        let newOffset = offset - show;
        let category = params.search.get("category");
        let source = params.search.get("source");
        let status = params.search.get("status");
        let classes = ["page-item"];
        let output = "";

        if (newOffset < 0) {
            newOffset = 0;
        }

        if (params.currentPage < 2) {
            classes.push("disabled");
        }

        output += `<li class="${classes.join(" ")}">
                <a class="page-link" href="?view=mods&offset=${newOffset}&show=${show}&category=${category}&source=${source}&status=${status}">Previous</a>
            </li>`;

        return output;
    }

    function showNextPage(params) {
        let offset = Number(params.search.get("offset"));
        let show = Number(params.search.get("show"));
        let newOffset = offset + show;
        let offsetLimit = Number(params.dataLength["mods"]) - show;
        //let pageLimit = Number(params.pageCount) - 1;
        let pageLimit = Number(params.pageCount);
        let category = params.search.get("category");
        let source = params.search.get("source");
        let status = params.search.get("status");
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
                <a class="page-link" href="?view=mods&offset=${newOffset}&show=${show}&category=${category}&source=${source}&status=${status}">Next</a>
            </li>`;

        return output;
    }

    function showNumberedPages(params) {
        let offset = Number(params.search.get("offset"));
        let show = Number(params.search.get("show"));
        let maxNum = Number(params.maxNum);
        let offsetText = offset + 1;
        let output = "";

        // numbered page situation was a shitshow - cheating with a prev + text + next solution for now

        output += `<li class="page-item disabled">
                <a class="page-link text-dark" href="?view=mods&offset=${offset}&show=${show}">Viewing ${offsetText} &ndash; ${maxNum} of ${params.dataLength["mods"]}</a>
            </li>`;

        return output;
    }

})();