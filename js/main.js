/**********
Still need to implement:
- Filter by name (search), category, source, status, nsfw/sfw
- Compare to Modwatch???
**********/

(function() {
    "use strict";

    function loadJSON(callback) {
        const xhr = new XMLHttpRequest();
        xhr.overrideMimeType("application/json");
        xhr.open("GET", "js/data.json", false);
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4 && xhr.status === 200) {
                callback(xhr.responseText);
            }
        };
        xhr.send();
    }

    function findNode(params) {
        let validNode = null;
        let nodeIterator = document.createNodeIterator(
            params.container, NodeFilter.SHOW_ELEMENT, {
                acceptNode: function(node) {
                    return NodeFilter.FILTER_ACCEPT;
                }
            }, false);
        let node = nodeIterator.root;

        while (node) {
            if (node.tagName.toLowerCase() === params.elem) {
                validNode = node;
            }
            node = nodeIterator.nextNode();
        }

        return validNode;
    }

    function insertChildNode(params) {
        let childNode = document.createElement(params.childNode);

        Object.keys(params.childAttr).forEach(function(key) {
            childNode.setAttribute(key, params.childAttr[key]);
        });
        childNode.innerHTML = params.contents;

        return childNode;
    }

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
            return field;
        } else {
            return "";
        }
    }

    function showLink(params) {
        let output = "";

        if (params.linkUrl) {
            output = "<a href=\"" + params.linkUrl + "\">" + params.resultName + "</a>";
        } else {
            output = params.resultName;
        }

        return output;
    }

    function showVersions(versions) {
        let output = "";

        if (typeof versions === "object") {
            output = "<ul class=\"list-unstyled\">";

            Object.keys(versions).forEach(function(key) {
                output += "<li>" + key + ": " + versions[key] + "</li>";
            });

            output += "</ul>";
        } else if (typeof versions === "string") {
            output = versions;
        }

        return output;
    }

    function showStatus(status, config) {
        let output = "";

        if (config.statusEnabled.includes(status.toLowerCase())) {
            output = "<span class=\"badge badge-pill badge-success\">" + status + "</span>";
        } else if (config.statusDisabled.includes(status.toLowerCase())) {
            output = "<span class=\"badge badge-pill badge-danger\">" + status + "</span>";
        } else if (config.statusCannibalize.includes(status.toLowerCase())) {
            output = "<span class=\"badge badge-pill badge-light\">" + status + "</span>";
        } else if (config.statusDownloaded.includes(status.toLowerCase())) {
            output = "<span class=\"badge badge-pill badge-secondary\">" + status + "</span>";
        } else if (status !== undefined) {
            output = "<span class=\"badge badge-pill badge-warning\">" + status + "</span>";
        }

        return output;
    }

    function showAssociatedMerges(merge) {
        let output = "";

        if (typeof merge === "object") {
            output = "<ul class=\"list-unstyled\">";

            Object.keys(merge).forEach(function(key) {
                output += "<li><a href=\"#merges\" id=\"modal-for-" + cleanMergeName(key) + "\" data-dismiss=\"modal\" data-toggle=\"modal\" data-target=\"#merge-modal\">" + key + "</a></li>";
            });

            output += "</ul>";
        }

        return output;
    }

    function showNavmeshToggle(navmesh) {
        let output = "";

        if (navmesh === "y") {
            output = "<span class=\"text-center navmesh-toggle\">&check;</span>";
        }

        return output;
    }

    function checkForMergedFileContents(merge) {
        if (typeof merge === "object") {
            return true;
        }
    }

    function showMergedFileAccordion(params) {
        let output = "";
        let merge = params.mergedFileContents[params.mergeName];
        let accordionId = params.childAttr[1] + "-details";

        if (checkForMergedFileContents(merge)) {
            output += "<a data-toggle=\"collapse\" href=\"#" + accordionId + "\"> [&hellip;]</a><div id=\"" + accordionId + "\" class=\"collapse\">" + showMergedFileContents(params) + "</div>";
        }

        return output;
    }

    function showMergedFileContents(params) {
        let output = "";
        let merge = params.mergedFileContents[params.mergeName];

        if (checkForMergedFileContents(merge)) {
            output += "<ul>";

            Object.keys(merge).forEach(function(key) {
                output += "<li><a href=\"#mods\" id=\"modal-for-" + cleanName(key) + "\" data-dismiss=\"modal\" data-toggle=\"modal\" data-target=\"#mod-modal\">" + key + "</a><ul>";
                output += merge[key][0].map((file) => "<li>" + file + "</li>").join("");
                output += "</ul></li>";
            });

            output += "</ul>";
        }

        return output;
    }

    function refreshModalContents(params) {
        const data = params.searchIn;
        const found = data.find(function(item) {
            return item.name === params.find;
        });
        let modalTitleNode = document.getElementById(params.modal + "-modal-title");
        let modalContentNode = document.getElementById(params.modal + "-modal-content");
        let newModalTitle = "";
        let newModalContent = "";

        if (found) {

            if (params.modal === "mod") { // mod modal
                if (found.url) {
                    newModalTitle = "<a href=\"" + found.url + "\">" + found.name + "</a>";
                } else {
                    newModalTitle = found.name;
                }

                newModalContent = "<dl class=\"row\"><dt class=\"col-sm-3\">Source:</dt><dd class=\"col-sm-9\">" + checkBasicField(found.source) + "</dd><dt class=\"col-sm-3\">Version(s):</dt><dd class=\"col-sm-9\">" + showVersions(found.versions) + "</dd><dt class=\"col-sm-3\">Category:</dt><dd class=\"col-sm-9\">" + checkBasicField(found.category) + "</dd><dt class=\"col-sm-3\">Merged to:</dt><dd class=\"col-sm-9\">" + showAssociatedMerges(found.mergedFiles) + "</dd><dt class=\"col-sm-3\">Status:</dt><dd class=\"col-sm-9\">" + showStatus(found.status, config) + "</dd><dt class=\"col-sm-3\">Comments:</dt><dd class=\"col-sm-9\"><p>" + checkBasicField(found.comments) + "</p></dd></dl>";

            } else { // merge modal

                params.mergeName = found.name;
                newModalTitle = found.name;
                newModalContent = "<dl class=\"row\"><dt class=\"col-sm-3\">Rebuild navmesh after merge?:</dt><dd class=\"col-sm-9\">" + showNavmeshToggle(found.rebuildNavmeshOnMerge) + "</dd><dt class=\"col-sm-3\">Merged files:</dt><dd class=\"col-sm-9\">" + showMergedFileContents(params) + "</dd><dt class=\"col-sm-3\">Comments:</dt><dd class=\"col-sm-9\"><p>" + checkBasicField(found.comments) + "</p></dd></dl>";

            }
        }

        modalTitleNode.innerHTML = newModalTitle;
        modalContentNode.innerHTML = newModalContent;
    }

    function dealWithUrl(params) {
        params.search = new URLSearchParams(document.location.search.substring(1));
        params.viewTab = window.location.hash;

        switch (params.viewTab) {
            case "#tools":
                $("#tools-nav").tab("show");
                break;
            case "#merges":
                $("#merges-nav").tab("show");
                break;
            default:
                $("#mods-nav").tab("show");
        }

        if (!params.search.get("offset")) {
            params.search.set("offset", 0);
        }
        if (!params.search.get("show")) {
            params.search.set("show", "10");
        }
    }

    function showPrevPage(params) {
        let newOffset = Number(params.offset) - Number(params.show);
        let output = "<li class=\"page-item";

        if (params.currentPage < 2) {
            output += " disabled";
        }
        output += "\"><a class=\"page-link\" href=\"?offset=" + newOffset + "&show=" + params.show + "\">Previous</a></li>";

        return output;
    }

    function showNumberedPages(params) {
        let output = "";
        let i = 1;
        let start = 0;

        while (i <= params.pageCount) {
            output += "<li class=\"page-item";
            if (params.currentPage === i) {
                output += " active";
            }
            output += "\"><a class=\"page-link\" href=\"?offset=" + start + "&show=" + params.show + "\">" + i + "</a>";
            start += Number(params.show);

            i++;
        }

        return output;
    }

    function showNextPage(params) {
        let newOffset = Number(params.offset) + Number(params.show);
        let output = "<li class=\"page-item";

        if (params.currentPage === params.pageCount) {
            output += " disabled";
        }
        output += "\"><a class=\"page-link\" href=\"?offset=" + newOffset + "&show=" + params.show + "\">Next</a></li>";

        return output;
    }

    function displayModStats(params) {
        let output = "";
        let total = Number(params.modStats["enabled"]) + Number(params.modStats["disabled"]);
        let enabledCount = Math.ceil((Number(params.modStats["enabled"]) / total) * 100);
        let disabledCount = Math.ceil((Number(params.modStats["disabled"]) / total) * 100);
        let otherCount = 100 - (enabledCount + disabledCount);

        output += "<div class=\"progress-bar bg-success\" role=\"progressbar\" style=\"width: " + enabledCount + "%\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Enabled: " + enabledCount + "%\">Enabled</div>";
        output += "<div class=\"progress-bar bg-danger\" role=\"progressbar\" style=\"width: " + disabledCount + "%\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"Disabled: " + disabledCount + "%\">Disabled</div>";
        output += "<div class=\"progress-bar bg-warning\" role=\"progressbar\" style=\"width: " + otherCount + "%\" data-toggle=\"tooltip\" data-placement=\"top\" title=\"???: " + otherCount + "%\">???</div>";

        return output;
    }

    function beep() {
        return "beep";
    }
    // callback
    /*let modwatch = loadJSON(function(response) {
        console.log(response); // dev
        return "beep";
    });*/
    let modwatch = beep();
    console.log(modwatch); // dev

    loadJSON(function(response) {
        const jsonResponse = JSON.parse(response);
        const mods = jsonResponse.mods;
        const tools = jsonResponse.tools;
        const mergedEsps = jsonResponse.mergedEsps;
        const config = {
            mergesContainer: "merges-table",
            mergesModal: "#merge-modal",
            modsContainer: "mods-table",
            modsModal: "#mod-modal",
            paginationContainer: "pagination",
            statsContainer: "mod-stats",
            statusCannibalize: ["resource"],
            statusDisabled: ["deactivated", "disabled", "smc - deactivated", "smc - disabled", "not installed"],
            statusDownloaded: ["downloaded"],
            statusEnabled: ["activated", "enabled", "smc", "smc - activated", "smc - enabled", "installed"],
            tabSelector: "a[data-toggle='tab']",
            toolsContainer: "tools-table"
        };
        let params = {
            childAttr: {},
            childNode: "tr",
            elem: "tbody",
            mergedFileContents: {},
            modStats: {
                enabled: 0,
                disabled: 0
            }
        };

        // determine what to show
        dealWithUrl(params);
        $(config.tabSelector).on("shown.bs.tab", function(e) { // Bootstrap tabs
            let href = e.target.getAttribute("href");
            history.replaceState(null, null, href);
            dealWithUrl(params);
        });

        // load mods
        params.container = document.getElementById(config.modsContainer);
        let modsTableNode = findNode(params);
        if (modsTableNode) {
            // respect requested pagination
            params.show = params.search.get("show");
            params.offset = params.search.get("offset");
            params.modListLength = mods.length;
            if (params.show === "all") { // show everything
                params.maxNum = params.modListLength;
                params.offset = 0;
                params.search.set("offset", 0);
            } else { // show by page
                params.maxNum = Number(params.offset) + Number(params.show);

                // make sure the numbers aren't out of bounds
                if (params.maxNum > params.modListLength) {
                    params.maxNum = params.modListLength;
                }
                if (params.offset >= params.maxNum) {
                    params.offset = Math.floor(Number(params.maxNum) - Number(params.show));
                    params.search.set("offset", params.offset);
                }

                params.pageCount = Math.ceil(Number(params.modListLength) / Number(params.search.get("show")));
                params.currentPage = Math.ceil(Number(params.offset) / Number(params.show)) + 1;
            }

            // get all the mods and create the merged file objects and stats
            Object.keys(mods).forEach(function(key) {
                let files = mods[key].mergedFiles;
                let status = mods[key].status.toLowerCase();

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

                if (status === "activated" || status === "enabled" || status === "smc" || status === "smc - activated" || status === "smc - enabled" || status === "installed") {
                    params.modStats["enabled"]++;
                } else if (status === "deactivated" || status === "disabled" || status === "smc - deactivated" || status === "smc - disabled" || status === "not installed") {
                    params.modStats["disabled"]++;
                }
            });
            // ... but now only show what's necessary
            let subset = mods.slice(params.offset, params.maxNum);
            Object.keys(subset).forEach(function(key) {
                params.resultName = subset[key].name;
                params.linkUrl = subset[key].url;
                params.childAttr["id"] = "row-" + cleanName(subset[key].name);
                if (subset[key].nsfw === "y") {
                    params.childAttr["class"] = "text-muted font-italic";
                }
                params.contents = "<td>" + showLink(params) + "</td><td>" + checkBasicField(subset[key].source) + "</td><td>" + showVersions(subset[key].versions) + "</td><td>" + checkBasicField(subset[key].category) + "</td><td>" + showAssociatedMerges(subset[key].mergedFiles) + "</td><td>" + showStatus(subset[key].status, config) + "</td><td>" + checkBasicField(subset[key].comments) + "</td>";
                modsTableNode.appendChild(insertChildNode(params));
                params.childAttr = {};
            });
        }

        // load tools
        params.container = document.getElementById(config.toolsContainer);
        let toolsTableNode = findNode(params);
        if (toolsTableNode) {
            Object.keys(tools).forEach(function(key) {
                params.resultName = tools[key].name;
                params.linkUrl = tools[key].url;
                params.childAttr["id"] = "row-" + cleanName(tools[key].name);
                params.contents = "<td>" + showLink(params) + "</td><td>" + checkBasicField(tools[key].source) + "</td><td>" + showVersions(tools[key].versions) + "</td><td>" + showStatus(tools[key].status, config) + "</td><td>" + checkBasicField(tools[key].comments) + "</td>";
                toolsTableNode.appendChild(insertChildNode(params));
                params.childAttr = {};
            });
        }

        // load merges
        params.container = document.getElementById(config.mergesContainer);
        let mergedEspsTableNode = findNode(params);
        if (mergedEspsTableNode) {
            Object.keys(mergedEsps).forEach(function(key) {
                params.childAttr["id"] = "row-" + cleanMergeName(mergedEsps[key].name);
                params.mergeName = mergedEsps[key].name;
                params.contents = "<td>" + checkBasicField(mergedEsps[key].name) + showMergedFileAccordion(params) + "</td><td>" + showNavmeshToggle(mergedEsps[key].rebuildNavmeshOnMerge) + "</td><td>" + checkBasicField(mergedEsps[key].comments) + "</td>";
                mergedEspsTableNode.appendChild(insertChildNode(params));
                params.childAttr = {};
            });
        }

        // load pagination
        if (params.show !== "all") {
            params.container = document.getElementById(config.paginationContainer);
            params.elem = null;
            params.childNode = "ul";
            params.childAttr["class"] = "pagination justify-content-center";
            let paginationNode = params.container;

            if (paginationNode) {
                params.contents = showPrevPage(params);
                params.contents += showNumberedPages(params);
                // next page
                params.contents += showNextPage(params);

                paginationNode.appendChild(insertChildNode(params));
            }
            params.childAttr = {};
        }

        // show stats
        params.container = document.getElementById(config.statsContainer);
        params.elem = null;
        params.childNode = "div";
        params.childAttr["class"] = "progress";
        let statsNode = params.container;

        if (statsNode) {
            params.contents = displayModStats(params);
            statsNode.appendChild(insertChildNode(params));
        }
        params.childAttr = {};

        // deal with modals
        $(config.modsModal).on("show.bs.modal", function(e) { // Bootstrap modal
            params.find = $(e.relatedTarget);
            params.find = params.find[0].innerHTML;
            params.modal = "mod";
            params.searchIn = mods;
            refreshModalContents(params);
        });
        $(config.mergesModal).on("show.bs.modal", function(e) { // Bootstrap modal
            params.find = $(e.relatedTarget);
            params.find = params.find[0].innerHTML;
            params.modal = "merge";
            params.searchIn = mergedEsps;
            refreshModalContents(params);
        });

    });

})();