import { Component } from "react";

export default class Footer extends Component {
    render(){
        return <footer className="display-board__footer">
                <div className="footer-ticker">
                    <span className="footer-ticker__hours">Buổi sáng: 7h00 – 10h30 · Buổi chiều: 13h00 – 16h30</span>
                </div>
                <div className="footer-bar">
                    <span className="footer-bar__org">UBND Phường Phước Thới</span>
                    <span className="footer-bar__sep" aria-hidden="true"></span>
                    <span className="footer-bar__addr">Số 232 đường Tôn Đức Thắng, KV Thới Thuận, TP. Cần Thơ</span>
                </div>
            </footer>;
    }
}