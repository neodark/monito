var _gui = (function () {
    var navbar = (function () {
        var actions = (function () {
            var displayMenu = function () {
                var nav = document.querySelector('nav');

                if (display === false) {
                    nav.style.display = 'block';
                    nav.style.opacity = '0';
                    setTimeout(function () {
                        nav.style.opacity = '1';
                    }, 100);

                    display = true;

                } else {
                    nav.style.display = 'none';

                    display = false;
                }
            };
            return {
                toggle: displayMenu
            }
        })();
        return {
            actions: actions
        }
    })();

    var displayInfo = function displayInfo(option) {
        var overlay = document.querySelector('#userInfoForm');

        if (option === 1) {
            overlay.classList.add('d-block');
        } else {
            overlay.classList.remove('d-block');
        }
    };

    var tabs = (function () {
        var allocatedMachines = {};
        var machinePool = {};
        var allocatedMachineView = $('#myMachinesView');
        var machinePoolView = $('#allMachinesView');

        var table = (function () {
            var columns = ['machine', 'owner', 'users', 'notes', 'actions']; // change the sequences to change the order of display.

            var actions = (function () {
                var build = function (rowData) {
                    var row = $('<tr></tr>').attr('id', rowData.machine);
                    for (var k in columns) {
                        if (columns.hasOwnProperty(k)) {
                            var col = $('<td></td>').html(getElement(rowData, columns[k])); // column
                            row.append(col);
                        }
                    }
                    return row;
                };

                var notes = (function () {
                    var initNotesDialog = function () {
                        var machineDropdown = $('#machines');
                        $.each(userMachines, function (key, value) {
                            machineDropdown.append($('<option></option>').attr('value', value['machine']).text(value['machine']));
                        });
                    };
                    return {
                        populateMachines: initNotesDialog
                    }
                })();
                return {
                    notes: notes,
                    buildRow: build
                }
            })();
            return {
                actions: actions
            }
        })();

        var releaseMachine = function (machineData) {
            // remove from allocated
            delete allocatedMachines[machineData.machine];
            // update the gui.
            $('#' + machineData.machine).remove();
            // add to pool.
            machinePool[machineData.machine] = machineData;
            // build a new row with new data
            machineData.actions = 'Assign to me';
            // append the new row
            machinePoolView.append(table.actions.buildRow(machineData));
        };

        var allocateMachine = function (machineData) {
            // remove from pool
            machinePool[machineData.machine];
            // update the gui.
            $('#' + machineData.machine).remove();
            // add to allocated
            allocatedMachines[machineData.machine] = machineData;
            // build a new row with new data
            machineData.actions = 'release';
            // append the new row
            allocatedMachineView.append(table.actions.buildRow(machineData));
        };

        var getAuthor = function getAuthor(data) {
            if (data.trim() === '') {
                return {author: '', body: '-'};
            } else if (data.indexOf('-') !== -1) {
                var tokens = data.split('-');
                return {author: tokens[0] + ' -', body: tokens[1]};
            } else {
                return {author: '@anonymous - ', body: data};
            }
        };

        /**
         * A callback that gets called when the allocate/de-allocate button is pressed.
         * @param rowData
         */
        var onClickHandler = function (rowData, endpoint) {
            _requests.sendRequest({
                url: '/'+ endpoint + '/'+ rowData.machine,
                requestType: 'put',
                data: JSON.stringify(rowData)
            }, function (response) {
                // todo: remove the machines from the
                if (endpoint === 'release') {
                    // release a machine.
                    releaseMachine(rowData);
                }
                else if (endpoint === 'allocate') {
                    allocateMachine(rowData);
                }
            }, function (error) {
                console.log(error);
            });
        };

        var getEndpoint = function (actionLabel) {
            switch (actionLabel) {
                case "release":
                    return actionLabel;
                case "Assign to me":
                    return "allocate";
                default:
                    return "none";
            }
        };

        var getElement = function getElement(arr, colName) {
            switch (colName) {
                case 'actions':
                    var classes = "btn btn-primary";
                    var actionsLabel = arr[colName];
                    var endpoint = getEndpoint(actionsLabel);
                    if (endpoint === "none")
                    {
                        return $('<button></button>').val(actionsLabel).html(actionsLabel).attr('class', classes);
                    }
                    return $('<button></button>').val(endpoint).html(actionsLabel).attr('class', classes).click(function () {
                        onClickHandler(arr, endpoint);
                    });
                case 'notes':
                    var notes = getAuthor(arr[colName]);
                    return $('<span></span> ' + notes['body']).css("color", "blue").html(notes['author']);
                    break;
                default:
                    return arr[colName];
                    break;
            }
        };

        var updateExistingRow = function updateUsersData(data) {
            // update the owner
            document.getElementById(data.machine).children[1].innerHTML = data.owner;
            document.getElementById(data.machine).children[2].innerHTML = data.users;
        };

        var isFree = (function (ip) {
            return machinePool.hasOwnProperty(ip);
        });

        var isAllocated = (function (ip) {
            return allocatedMachines.hasOwnProperty(ip);
        });

        var machineExists = (function (ip) {
            return isFree(ip) || isAllocated(ip);
        });

        /**
         * Renders the view with the data provided.
         *
         * @param data - an object like {"free": [{}, {}]}
         * @param view - a ui element
         * @param poolType - either machinePool or freeMachines object
         *
         */
        var renderTable = (function (data, view, poolType) {
            // for each tab
            $.each(data, function (key, rowData) {
                if (!machineExists(rowData.machine)) {
                    // for each row update the view.
                    var row = table.actions.buildRow(rowData);
                    view.append(row);
                    // add machine to the corresponding pool
                    poolType[row.id] = rowData;
                } else {
                    // update the existing row
                    updateExistingRow(rowData);
                }
            });
        });

        /**
         * machines : [{"free": [{}, {}]}, {"allocated": [{}, {}]}]
         */
        var init = (function (machines) {
            // reload the gui.
            renderTable(machines.filter(function (machine) {
                return !machine.isAllocated;
            }), machinePoolView, machinePool);
            renderTable(machines.filter(function (machine) {
                return machine.isAllocated;
            }), allocatedMachineView, allocatedMachines);
        });

        return {
            init: init
        }
    })();

    return {
        displayInfo: displayInfo,
        navbar: navbar,
        tabs: tabs
    }
})();
