import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";
import Heatmap from "./Heatmap";
import RidgeLine from "./RidgeLine";
import SwarmPlot from "./SwarmPlot";

const MainPage = () => {
    return (
        <Router>
            <div>
                <nav>
                    <ul>
                        <li>
                            <Link to="/heatmap">Heat Map</Link>
                        </li>
                        <li>
                            <Link to="/ridge_line">Ridge line graphs</Link>
                        </li>
                        <li>
                            <Link to="/swarm">Swarm plots</Link>
                        </li>
                    </ul>
                </nav>
                <hr/>
                <Switch>
                    <Route path="/heatmap">
                        <Heatmap />
                    </Route>
                    <Route path="/ridge_line">
                        <RidgeLine />
                    </Route>
                    <Route path="/swarm">
                        <SwarmPlot />
                    </Route>
                </Switch>
            </div>
        </Router>
    );
}

export default MainPage;