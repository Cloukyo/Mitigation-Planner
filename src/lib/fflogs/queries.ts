export const REPORT_FIGHTS_QUERY = `
  query ReportFights($code: String!) {
    reportData {
      report(code: $code) {
        code
        title
        startTime
        endTime
        fights {
          id
          encounterID
          name
          startTime
          endTime
          kill
          bossPercentage
          fightPercentage
          difficulty
        }
      }
    }
  }
`;

export const REPORT_EVENTS_QUERY = `
  query ReportEvents($code: String!, $startTime: Float!, $endTime: Float!, $dataType: EventDataType, $limit: Int, $sourceAurasPresent: String, $hostilityType: HostilityType) {
    reportData {
      report(code: $code) {
        events(startTime: $startTime, endTime: $endTime, dataType: $dataType, limit: $limit, sourceAurasPresent: $sourceAurasPresent, hostilityType: $hostilityType) {
          data
          nextPageTimestamp
        }
      }
    }
  }
`;

export const MASTER_DATA_QUERY = `
  query ReportMasterData($code: String!) {
    reportData {
      report(code: $code) {
        masterData {
          actors {
            id
            name
            type
            subType
          }
          abilities {
            gameID
            name
            type
          }
        }
      }
    }
  }
`;

export const DISCOVER_REPORTS_QUERY = `
  query DiscoverReports($zoneID: Int, $gameZoneID: Int, $startTime: Float, $endTime: Float, $limit: Int, $page: Int) {
    reportData {
      reports(zoneID: $zoneID, gameZoneID: $gameZoneID, startTime: $startTime, endTime: $endTime, limit: $limit, page: $page) {
        data {
          code
          title
          startTime
          endTime
          fights {
            id
            encounterID
            name
            startTime
            endTime
            kill
            bossPercentage
            fightPercentage
            difficulty
          }
        }
        total
        current_page
        last_page
      }
    }
  }
`;
