import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route, Link
} from "react-router-dom";
import HeatmapContainer from "./HeatmapContainer";
import RidgeLineContainer from "./RidgeLineContainer";
import SwarmPlot from "./SwarmPlot";
import {Nav} from "react-bootstrap";

const MainPage = () => {
    return (
        <Router>
            <div>
                <Nav>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/heatmap">Heat Map</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/ridge_line">Ridge line</Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to="/swarm">Swarm plot</Nav.Link>
                    </Nav.Item>
                </Nav>
                <hr/>
                <Switch>
                    <Route path="/heatmap">
                        <HeatmapContainer />
                    </Route>
                    <Route path="/ridge_line">
                        <RidgeLineContainer />
                    </Route>
                    <Route path="/swarm">
                        <SwarmPlot />
                    </Route>
                    <Route path="/">
                        <HeatmapContainer />
                    </Route>
                </Switch>
            </div>
        </Router>
    );
}

export default MainPage;