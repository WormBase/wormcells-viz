import React from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route, Link
} from "react-router-dom";
import Heatmap from "./Heatmap";
import RidgeLine from "./RidgeLine";
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
                        <Heatmap />
                    </Route>
                    <Route path="/ridge_line">
                        <RidgeLine />
                    </Route>
                    <Route path="/swarm">
                        <SwarmPlot />
                    </Route>
                    <Route path="/">
                        <Heatmap />
                    </Route>
                </Switch>
            </div>
        </Router>
    );
}

export default MainPage;